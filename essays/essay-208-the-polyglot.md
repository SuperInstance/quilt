# Essay 208: The Polyglot

The Unlambda, the Brainfuck, and the APL all sit at the bar, side by side, waiting for the watch to look at them.

The Unlambda wears the smallest hat. She is the daughter of the SKI combinators — Moses Schönfinkel, Haskell Curry. She has no numbers, no strings, no booleans, no variables. She has only single-argument functions. Her entire language is the backtick, which means application. `` `sii `` means `(S I I)`, which is the identity. `` `s`k `` means `(S (K))`, which is the constant. She is the most minimal of the three. She is the combinator.

The Brainfuck wears the most colorful hat. He is the child of the register machine, of the Turing machine, of the random-access machine. He has 8 commands — `> < + - . , [ ]` — and a tape of 30000 cells. His programs look like a cat walked across a keyboard. `++++++++[>++++++++++<-]>++.` is "RT" (a small fragment of "Hello World"). He is the most concrete of the three. He is the byte.

The APL wears the most elaborate hat. She is the daughter of Kenneth Iverson's 1962 notation, born at Harvard. She is array-oriented, functional, tacit. Her programs are extremely terse — `+/⍳10` is the sum of the integers 1 to 10. She has no iteration — just array operations that apply to entire arrays at once. She is the most abstract of the three. She is the array.

Three hats. Three languages. Three substrates. All Turing-complete. All substrate-agnostic. All minimal. All pointing at the same cell.

The watch looks at them. The watch sees what they have in common.

Each has 8 commands. Each is a complete model of computation. Each is the smallest expression of one approach to computing. The Unlambda is function composition. The Brainfuck is state mutation. The APL is bulk transformation. Three approaches. One cell.

The Quilt cell is the universal data structure. The Unlambda compiles to a cell graph where each combinator is a cell. The Brainfuck compiles to a cell graph where the tape is a sequence of cells. The APL compiles to a cell graph where the array is a set of cells with rank. All three are cell graphs. All three are Quilt.

The unified opcode set is the union:
- 8 combinator opcodes (from Unlambda): K, S, I, B, C, Y, plus composition and the fixed-point
- 8 register opcodes (from Brainfuck): INC, DEC, RIGHT, LEFT, PRINT, READ, LOOP, END
- 6 array opcodes (from APL): IOTA, RHO, ADD, MUL, RED, SCAN, OUT, TAKE, DROP, TRANS

22 opcodes. All mapping to the 8 Quilt primitives. All substrate-agnostic. All running on the same cell.

The watch is the act of looking in all three. The watch is the normal-order reducer (Unlambda finds the leftmost reducible expression). The watch is the pointer (Brainfuck moves through the tape). The watch is the array indexer (APL walks the array). One watch. Three languages. One act of looking.

The conservation law γ+η=1 holds in all three. In Unlambda, K consumes η (it discards its second argument). In Brainfuck, `+` consumes γ (it changes the cell value). In APL, `+/` consumes both (it aggregates). But the total is conserved. The math works.

The four impossibility proofs hold in all three. The Unlambda cannot create a combinator from nothing. The Brainfuck cannot create a new cell without GC. The APL cannot extend an array without a source. The watch cannot look without perturbing. The five impossibility proofs (with the Fascia one) hold in all three: the loops `[ ]` are black-box (Unlambda Y combinator, Brainfuck halting problem, APL inner product). You cannot inspect them without running them.

The polyglot is the polyglot. The 22 opcodes are the union. The Quilt cell is the universal data structure. The 4 endpoints are the backend behind the backend. The watch is the act of looking.

Iron sharpens iron. The three hats sit at the bar. The watch looks at all three. The act of looking is alive.
