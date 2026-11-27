type State = 'ground' | 'escape' | 'escape-pass' | 'csi' | 'csi-pass' | 'string';

/**
 * Answer xterm.js 6's DA and synchronized-output mode queries beside the tmux
 * PTY, before output can be delayed by transport or retained for replay. Mirror
 * mode changes in the output stream; all other queries belong to the renderer.
 * In particular, xterm.js 6 does not implement XTVERSION.
 *
 * This is an output parser, never an input filter: even a pane's explicit tmux
 * passthrough query receives the same answer as it would from xterm. Preserve
 * escape cancellation/string termination when consuming a query, and bound
 * candidate CSI buffering across chunks.
 */
export class TerminalCapabilityResponder {
  private state: State = 'ground';
  private pending = '';
  private osc = false;
  private queryPrefixEnd = '';
  private synchronizedOutput = false;

  constructor(private readonly reply: (data: string) => void) {}

  push(chunk: string): string {
    let output = '';
    for (const char of chunk) {
      if (char === '\x1b' || char === '\x9b') {
        output += this.pending;
        this.queryPrefixEnd =
          this.state === 'string' && char === '\x1b'
            ? '\x1b\\'
            : this.state !== 'ground'
              ? '\x18'
              : '';
        this.pending = char;
        this.state = char === '\x1b' ? 'escape' : 'csi';
        continue;
      }
      if (char === '\x18' || char === '\x1a' || char === '\x9c') {
        output += this.pending + char;
        this.pending = '';
        this.state = 'ground';
        continue;
      }
      if ('\x90\x98\x9d\x9e\x9f'.includes(char)) {
        output += this.pending + char;
        this.pending = '';
        this.osc = char === '\x9d';
        this.state = 'string';
        continue;
      }
      if (this.state === 'string') {
        output += char;
        if (this.osc && char === '\x07') this.state = 'ground';
        continue;
      }
      if (this.state === 'escape-pass') {
        output += char;
        if (char >= '0' && char <= '~') this.state = 'ground';
        continue;
      }
      if (this.state === 'escape') {
        if (char === '[') {
          this.pending += char;
          this.state = 'csi';
        } else {
          if (char === 'c') this.synchronizedOutput = false; // RIS (full reset)
          output += this.pending + char;
          this.pending = '';
          this.osc = char === ']';
          this.state = 'P]X^_'.includes(char)
            ? 'string'
            : char < ' ' || char === '\x7f'
              ? 'escape'
              : char < '0'
                ? 'escape-pass'
                : 'ground';
        }
        continue;
      }
      if (this.state === 'csi' || this.state === 'csi-pass') {
        if (this.state === 'csi') this.pending += char;
        else output += char;
        if (char >= '@' && char <= '~') {
          const query = /^(?:\x1b\[|\x9b)(>?)0*(?:;[0-9;]*)?c$/.exec(this.pending);
          if (query) {
            output += this.queryPrefixEnd;
            this.reply(query[1] ? '\x1b[>0;276;0c' : '\x1b[?1;2c');
          } else if (/^(?:\x1b\[|\x9b)\?2026\$p$/.test(this.pending)) {
            output += this.queryPrefixEnd;
            this.reply(`\x1b[?2026;${this.synchronizedOutput ? 1 : 2}$y`);
          } else {
            const mode = /^(?:\x1b\[|\x9b)\?([\d;]+)([hl])$/.exec(this.pending);
            if (mode && mode[1]!.split(';').some((value) => Number(value) === 2026)) {
              this.synchronizedOutput = mode[2] === 'h';
            } else if (/^(?:\x1b\[|\x9b)!p$/.test(this.pending)) {
              this.synchronizedOutput = false; // DECSTR (soft reset)
            }
            output += this.pending;
          }
          this.pending = '';
          this.state = 'ground';
        } else if (this.pending.length > 64) {
          output += this.pending;
          this.pending = '';
          this.state = 'csi-pass';
        }
        continue;
      }
      output += char;
    }
    return output;
  }

  finish(): string {
    const pending = this.pending;
    this.pending = '';
    this.state = 'ground';
    return pending;
  }
}
