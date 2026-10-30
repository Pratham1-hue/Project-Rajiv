// Converts source code into words a speech synthesizer will actually say.
// Speech engines silently skip most symbols, so "if a > b:" would be heard as "if a b".
// Levels mirror screen-reader punctuation settings: some < most < all.

export type SymbolLevel = "some" | "most" | "all";
export const SYMBOL_LEVELS: readonly SymbolLevel[] = ["some", "most", "all"];

/** Markers the backend wraps around code fragments inside speech text. */
export const CODE_OPEN = "\u27e6";
export const CODE_CLOSE = "\u27e7";

const RANK: Record<SymbolLevel, number> = { some: 0, most: 1, all: 2 };

// [symbol, spoken word, minimum level at which it is spoken]
const OPERATORS: Array<[string, string, SymbolLevel]> = (
  [
    ["**=", "power equals", "some"],
    ["//=", "floor divide equals", "some"],
    [">>=", "shift right equals", "most"],
    ["<<=", "shift left equals", "most"],
    ["===", "strictly equals", "some"],
    ["!==", "strictly not equal to", "some"],
    ["...", "ellipsis", "most"],
    ["==", "is equal to", "some"],
    ["!=", "is not equal to", "some"],
    ["<=", "less than or equal to", "some"],
    [">=", "greater than or equal to", "some"],
    ["+=", "plus equals", "some"],
    ["-=", "minus equals", "some"],
    ["*=", "times equals", "some"],
    ["/=", "divide equals", "some"],
    ["%=", "mod equals", "some"],
    ["&=", "and equals", "most"],
    ["|=", "or equals", "most"],
    ["^=", "x or equals", "most"],
    [":=", "walrus assign", "some"],
    ["->", "returns", "some"],
    ["=>", "arrow", "some"],
    ["**", "to the power of", "some"],
    ["//", "floor divide", "some"],
    ["&&", "and", "some"],
    ["||", "or", "some"],
    ["??", "nullish or", "some"],
    ["?.", "optional dot", "most"],
    ["<<", "shift left", "most"],
    [">>", "shift right", "most"],
    ["=", "equals", "some"],
    ["<", "less than", "some"],
    [">", "greater than", "some"],
    ["+", "plus", "some"],
    ["-", "minus", "some"],
    ["*", "times", "some"],
    ["/", "divided by", "some"],
    ["%", "mod", "some"],
    ["!", "not", "some"],
    ["(", "open paren", "most"],
    [")", "close paren", "most"],
    ["[", "open bracket", "most"],
    ["]", "close bracket", "most"],
    ["{", "open brace", "most"],
    ["}", "close brace", "most"],
    [".", "dot", "most"],
    [":", "colon", "most"],
    [";", "semicolon", "most"],
    ["@", "at", "most"],
    ["&", "ampersand", "most"],
    ["|", "pipe", "most"],
    ["^", "caret", "most"],
    ["~", "tilde", "most"],
    ["\\", "backslash", "most"],
    ["?", "question mark", "most"],
    ["$", "dollar", "most"],
    [",", "comma", "all"],
  ] as Array<[string, string, SymbolLevel]>
).sort((a, b) => b[0].length - a[0].length);

// Literal names used inside string contents at the "all" level
const LITERAL_NAMES: Record<string, string> = {
  "/": "slash",
  "-": "dash",
  ".": "dot",
  ":": "colon",
  ",": "comma",
  "_": "underscore",
  "#": "hash",
};

const IDENTIFIER = /^[\p{L}_$][\p{L}\p{N}_$]*/u;
const NUMBER = /^\d[\d_]*(?:\.\d+)?(?:[eE][+-]?\d+)?/;

type TokenKind = "operand" | "operator" | "open" | null;

function speakIdentifier(id: string, level: SymbolLevel): string {
  if (level === "all") {
    return id.split("_").join(" underscore ").replace(/\s+/g, " ").trim();
  }
  const dunder = /^__(\w+?)__$/.exec(id);
  if (dunder) return `dunder ${dunder[1].replace(/_+/g, " ")}`;
  return id.replace(/_+/g, " ").trim() || "underscore";
}

function speakStringContent(content: string, level: SymbolLevel): string {
  if (level !== "all") return content;
  return content.replace(/[/\-.:,_#]/g, (ch) => ` ${LITERAL_NAMES[ch]} `);
}

/** Translate one fragment of source code into speakable words. */
export function verbalizeCode(code: string, level: SymbolLevel = "most"): string {
  const rank = RANK[level];
  const out: string[] = [];
  let lastKind: TokenKind = null;
  let i = 0;

  while (i < code.length) {
    const rest = code.slice(i);
    const ch = code[i];

    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    // Comments: speak "comment" and read the remainder as plain prose
    const isHashComment = ch === "#" && (i === 0 || /\s/.test(code[i - 1]));
    const isSlashComment = rest.startsWith("//") && lastKind !== "operand";
    if (isHashComment || isSlashComment) {
      out.push("comment", code.slice(i + (isHashComment ? 1 : 2)).trim());
      break;
    }

    // String literals, including Python triple quotes
    const quote = rest.startsWith('"""') ? '"""' : rest.startsWith("'''") ? "'''" : /["'`]/.test(ch) ? ch : null;
    if (quote) {
      let j = i + quote.length;
      while (j < code.length && !code.startsWith(quote, j)) {
        j += code[j] === "\\" ? 2 : 1;
      }
      const closed = j < code.length;
      const content = code.slice(i + quote.length, j).trim();
      const triple = quote.length === 3;
      if (level === "all") {
        out.push(triple ? "triple quote" : "quote", speakStringContent(content, level), closed ? "end quote" : "");
      } else if (level === "most") {
        out.push(content ? `string ${content}` : triple ? "triple quote" : "empty string");
      } else {
        out.push(content || (triple ? "triple quote" : "empty string"));
      }
      i = closed ? j + quote.length : code.length;
      lastKind = "operand";
      continue;
    }

    const num = NUMBER.exec(rest);
    if (num) {
      out.push(num[0].replace(/_/g, ""));
      i += num[0].length;
      lastKind = "operand";
      continue;
    }

    const ident = IDENTIFIER.exec(rest);
    if (ident) {
      out.push(speakIdentifier(ident[0], level));
      i += ident[0].length;
      lastKind = "operand";
      continue;
    }

    const op = OPERATORS.find(([sym]) => rest.startsWith(sym));
    if (op) {
      const [sym, word, minLevel] = op;
      let spoken = word;
      // Prefix * and ** unpack arguments rather than multiply
      if ((sym === "*" || sym === "**") && lastKind !== "operand") {
        spoken = sym === "*" ? "star" : "double star";
      }
      if (RANK[minLevel] <= rank) {
        out.push(spoken);
      } else if (sym === "," && out.length) {
        // An unspoken comma still becomes a pause so arguments don't run together
        out[out.length - 1] += ",";
      }
      i += sym.length;
      lastKind = /[)\]}]/.test(sym) ? "operand" : /[([{]/.test(sym) ? "open" : "operator";
      continue;
    }

    out.push(ch);
    i++;
  }

  const result = out.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  // Lines made only of hidden symbols (e.g. "}" at "some") must not become silent
  return result || (level === "all" ? code.trim() : verbalizeCode(code, "all"));
}

/**
 * For each line, the string delimiter that is still open at the start of that line
 * (e.g. inside a multi-line docstring), or null. Lets single lines be spoken in context.
 */
export function openStringAtLineStart(code: string, language: "python" | "javascript"): Array<string | null> {
  const states: Array<string | null> = [null];
  let open: string | null = null;
  let i = 0;
  while (i < code.length) {
    const ch = code[i];
    if (ch === "\n") {
      // Ordinary quotes cannot span lines; only triple quotes and JS template literals can
      if (open && open.length === 1 && open !== "`") open = null;
      states.push(open);
      i++;
      continue;
    }
    if (open) {
      if (ch === "\\") {
        i += code[i + 1] === "\n" ? 1 : 2;
      } else if (code.startsWith(open, i)) {
        i += open.length;
        open = null;
      } else {
        i++;
      }
      continue;
    }
    const isComment =
      ch === "#" || (language === "javascript" && code.startsWith("//", i));
    if (isComment) {
      while (i < code.length && code[i] !== "\n") i++;
      continue;
    }
    if (code.startsWith('"""', i) || code.startsWith("'''", i)) {
      open = code.slice(i, i + 3);
      i += 3;
    } else if (ch === '"' || ch === "'" || (language === "javascript" && ch === "`")) {
      open = ch;
      i++;
    } else {
      i++;
    }
  }
  return states;
}

/** Speech text for one source line, aware of strings opened on earlier lines. */
export function lineToSpeech(line: string, openDelimiter: string | null): string {
  const trimmed = line.trim();
  if (!openDelimiter) return codeSpan(trimmed);
  const close = line.indexOf(openDelimiter);
  if (close === -1) return trimmed;
  const prose = line.slice(0, close).trim();
  const rest = line.slice(close + openDelimiter.length).trim();
  return [prose && `${prose},`, "end string", rest && codeSpan(rest)].filter(Boolean).join(" ");
}

/** Prepare mixed prose + marked code for speech: only marked code is verbalized. */
export function toSpeech(text: string, level: SymbolLevel): string {
  return text
    .replace(new RegExp(`${CODE_OPEN}([\\s\\S]*?)${CODE_CLOSE}`, "g"), (_, code: string) => verbalizeCode(code, level))
    .replace(new RegExp(`[${CODE_OPEN}${CODE_CLOSE}]`, "g"), "");
}

/** Strip code markers for on-screen text and screen-reader live regions. */
export function toDisplayText(text: string): string {
  return text.replace(new RegExp(`[${CODE_OPEN}${CODE_CLOSE}]`, "g"), "");
}

export function codeSpan(code: string): string {
  return `${CODE_OPEN}${code}${CODE_CLOSE}`;
}
