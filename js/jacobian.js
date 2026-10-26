/* Symbolic Jacobian for a small class of expressions. No libraries. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.JacobianCalc = api;
  if (typeof document !== "undefined") api.boot();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var MINUS = "\u2212";
  var FUNCS = { sin: 1, cos: 1, tan: 1, exp: 1, ln: 1, log: 1, sqrt: 1 };
  var VARS = ["x", "y", "z"];

  function gcd(a, b) {
    a = a < 0n ? -a : a;
    b = b < 0n ? -b : b;
    while (b !== 0n) {
      var t = a % b;
      a = b;
      b = t;
    }
    return a === 0n ? 1n : a;
  }

  function rat(n, d) {
    if (d === 0n) throw new Error("Division by zero.");
    if (d < 0n) {
      n = -n;
      d = -d;
    }
    var g = gcd(n, d);
    return { n: n / g, d: d / g };
  }

  function radd(a, b) { return rat(a.n * b.d + b.n * a.d, a.d * b.d); }
  function rsub(a, b) { return rat(a.n * b.d - b.n * a.d, a.d * b.d); }
  function rmul(a, b) { return rat(a.n * b.n, a.d * b.d); }
  function rdiv(a, b) {
    if (b.n === 0n) throw new Error("Division by zero.");
    return rat(a.n * b.d, a.d * b.n);
  }
  function rneg(a) { return rat(-a.n, a.d); }
  function isZero(a) { return a.n === 0n; }
  function req(a, b) { return a.n === b.n && a.d === b.d; }
  function fmtRat(a) {
    var sign = a.n < 0n ? MINUS : "";
    var n = a.n < 0n ? -a.n : a.n;
    if (a.d === 1n) return sign + n.toString();
    return sign + n.toString() + "/" + a.d.toString();
  }

  var ZERO = rat(0n, 1n);
  var ONE = rat(1n, 1n);

  function num(n, d) { return { t: "num", v: rat(n, d || 1n) }; }
  function userError(msg) {
    var err = new Error(msg);
    err.user = true;
    return err;
  }

  function powRat(a, k) {
    if (k < 0n) {
      if (a.n === 0n) throw userError("Division by zero.");
      return powRat(rat(a.d, a.n), -k);
    }
    var n = 1n;
    var d = 1n;
    for (var i = 0n; i < k; i++) {
      n *= a.n;
      d *= a.d;
      if (n.toString().length > 40 || d.toString().length > 40) {
        throw userError("This power is too large for exact arithmetic on this page.");
      }
    }
    return rat(n, d);
  }

  function emptyFacKey(facs) {
    return facs.map(function (f) { return f.sig + "#" + f.exp.toString(); }).join("|");
  }

  function sortFacs(facs) {
    return facs.filter(function (f) { return f.exp !== 0n; }).sort(function (a, b) {
      if (a.sig < b.sig) return -1;
      if (a.sig > b.sig) return 1;
      return 0;
    });
  }

  function mergeFacs(list) {
    var map = {};
    var order = [];
    list.forEach(function (f) {
      if (f.exp === 0n) return;
      if (!map[f.sig]) {
        map[f.sig] = { sig: f.sig, exp: 0n, atom: f.atom };
        order.push(f.sig);
      }
      map[f.sig].exp += f.exp;
    });
    return sortFacs(order.map(function (sig) { return map[sig]; }));
  }

  function term(coef, facs) {
    return { coef: coef, facs: sortFacs(facs) };
  }

  function canon(sum) {
    return sum.map(function (t) {
      return t.coef.n.toString() + "/" + t.coef.d.toString() + "*" + emptyFacKey(t.facs);
    }).sort().join("+");
  }

  function addSums(a, b) {
    var map = {};
    function put(t) {
      if (isZero(t.coef)) return;
      var key = emptyFacKey(t.facs);
      if (!map[key]) map[key] = { coef: ZERO, facs: t.facs };
      map[key].coef = radd(map[key].coef, t.coef);
    }
    a.forEach(put);
    b.forEach(put);
    var out = [];
    Object.keys(map).forEach(function (key) {
      if (!isZero(map[key].coef)) out.push(map[key]);
    });
    return out;
  }

  function mulSums(a, b) {
    if (!a.length || !b.length) return [];
    if (a.length * b.length > 80) throw userError("This expression expands into too many terms for this page.");
    var out = [];
    for (var i = 0; i < a.length; i++) {
      for (var j = 0; j < b.length; j++) {
        var coef = rmul(a[i].coef, b[j].coef);
        if (isZero(coef)) continue;
        out.push(term(coef, mergeFacs(a[i].facs.concat(b[j].facs))));
      }
    }
    return out.reduce(function (acc, t) { return addSums(acc, [t]); }, []);
  }

  function powTerm(one, k) {
    var coef = powRat(one.coef, k);
    var facs = one.facs.map(function (f) {
      return { sig: f.sig, exp: f.exp * k, atom: f.atom };
    });
    return term(coef, facs);
  }

  function powSum(sum, k) {
    if (k === 0n) return [term(ONE, [])];
    if (!sum.length) {
      if (k < 0n) throw userError("Division by zero.");
      return [];
    }
    if (sum.length === 1) return [powTerm(sum[0], k)];
    if (k < 0n) {
      var sig = "c:" + canon(sum);
      return [term(ONE, [{ sig: sig, exp: k, atom: { k: "sum", sum: sum } }])];
    }
    if (k > 8n) throw userError("Use a power of 8 or smaller when the base has more than one term.");
    var acc = [term(ONE, [])];
    for (var i = 0n; i < k; i++) acc = mulSums(acc, sum);
    return acc;
  }

  function toSum(node) {
    if (!node) return [];
    if (node.t === "num") {
      if (isZero(node.v)) return [];
      return [term(node.v, [])];
    }
    if (node.t === "sym") {
      return [term(ONE, [{ sig: "v:" + node.name, exp: 1n, atom: { k: "var", name: node.name } }])];
    }
    if (node.t === "fn") {
      var arg = toSum(node.arg);
      var name = node.name === "log" ? "ln" : node.name;
      var sig = "fn:" + name + "(" + canon(arg) + ")";
      return [term(ONE, [{ sig: sig, exp: 1n, atom: { k: "fn", name: name, arg: arg } }])];
    }
    if (node.t === "add") {
      return node.args.reduce(function (acc, arg) { return addSums(acc, toSum(arg)); }, []);
    }
    if (node.t === "mul") {
      return node.args.reduce(function (acc, arg) { return mulSums(acc, toSum(arg)); }, [term(ONE, [])]);
    }
    if (node.t === "pow") return powSum(toSum(node.base), node.exp);
    throw userError("This expression uses a form the page cannot simplify.");
  }

  function deriv(node, variable) {
    if (node.t === "num") return num(0n, 1n);
    if (node.t === "sym") return node.name === variable ? num(1n, 1n) : num(0n, 1n);
    if (node.t === "add") return { t: "add", args: node.args.map(function (arg) { return deriv(arg, variable); }) };
    if (node.t === "mul") {
      var parts = [];
      for (var i = 0; i < node.args.length; i++) {
        var args = node.args.slice();
        args[i] = deriv(node.args[i], variable);
        parts.push({ t: "mul", args: args });
      }
      return { t: "add", args: parts };
    }
    if (node.t === "pow") {
      if (node.exp === 0n) return num(0n, 1n);
      return {
        t: "mul",
        args: [
          num(node.exp, 1n),
          { t: "pow", base: node.base, exp: node.exp - 1n },
          deriv(node.base, variable)
        ]
      };
    }
    if (node.t === "fn") {
      var chain;
      var name = node.name === "log" ? "ln" : node.name;
      if (name === "sin") chain = { t: "fn", name: "cos", arg: node.arg };
      else if (name === "cos") chain = { t: "mul", args: [num(-1n, 1n), { t: "fn", name: "sin", arg: node.arg }] };
      else if (name === "tan") chain = { t: "pow", base: { t: "fn", name: "cos", arg: node.arg }, exp: -2n };
      else if (name === "exp") chain = { t: "fn", name: "exp", arg: node.arg };
      else if (name === "ln") chain = { t: "pow", base: node.arg, exp: -1n };
      else if (name === "sqrt") {
        chain = {
          t: "mul",
          args: [num(1n, 2n), { t: "pow", base: { t: "fn", name: "sqrt", arg: node.arg }, exp: -1n }]
        };
      } else throw userError("The function " + name + " is not supported.");
      return { t: "mul", args: [chain, deriv(node.arg, variable)] };
    }
    throw userError("This expression uses a form the page cannot differentiate.");
  }

  function fmtFac(fac, positiveExp) {
    var exp = positiveExp ? (fac.exp < 0n ? -fac.exp : fac.exp) : fac.exp;
    var base;
    if (fac.atom.k === "var") base = fac.atom.name;
    else if (fac.atom.k === "fn") base = fac.atom.name + "(" + fmtSum(fac.atom.arg) + ")";
    else base = wrapSum(fac.atom.sum);
    if (exp === 1n) return base;
    var expText = exp.toString();
    if (exp < 0n) expText = MINUS + (-exp).toString();
    if (base.length > 1 && fac.atom.k !== "fn") return base + "^" + expText;
    if (fac.atom.k === "fn" || fac.atom.k === "sum") return base + "^" + expText;
    return base + "^" + expText;
  }

  function joinFacs(facs, positive) {
    var s = "";
    facs.forEach(function (fac) {
      var piece = fmtFac(fac, positive);
      if (s && (/^(sin|cos|tan|exp|ln|sqrt)/.test(piece) || (piece.charAt(0) === "(" && /[a-z)]$/.test(s)))) {
        s += " ";
      }
      s += piece;
    });
    return s;
  }

  function fmtTerm(one) {
    var neg = one.coef.n < 0n;
    var n = one.coef.n < 0n ? -one.coef.n : one.coef.n;
    var d = one.coef.d;
    var numFacs = one.facs.filter(function (f) { return f.exp > 0n; });
    var denFacs = one.facs.filter(function (f) { return f.exp < 0n; });
    var numBody = "";
    if (n !== 1n || numFacs.length === 0) numBody = n.toString();
    numBody += joinFacs(numFacs, true);
    if (!numBody) numBody = "1";
    var denParts = [];
    if (d !== 1n) denParts.push(d.toString());
    denFacs.forEach(function (f) { denParts.push(fmtFac(f, true)); });
    if (!denParts.length) return { neg: neg, body: numBody };
    var denBody = denParts.join("");
    if (denBody.charAt(0) !== "(" && (denParts.length > 1 || /[+\u2212]/.test(denBody))) denBody = "(" + denBody + ")";
    return { neg: neg, body: numBody + "/" + denBody };
  }

  function termKey(one) {
    if (!one.facs.length) return "~~~";
    return emptyFacKey(one.facs);
  }

  function fmtSum(sum) {
    var terms = sum.filter(function (t) { return !isZero(t.coef); }).slice().sort(function (a, b) {
      var ka = termKey(a);
      var kb = termKey(b);
      if (ka < kb) return -1;
      if (ka > kb) return 1;
      return 0;
    });
    if (!terms.length) return "0";
    var parts = terms.map(fmtTerm);
    var s = parts[0].neg ? MINUS + parts[0].body : parts[0].body;
    for (var i = 1; i < parts.length; i++) {
      s += parts[i].neg ? " " + MINUS + " " + parts[i].body : " + " + parts[i].body;
    }
    return s;
  }

  function wrapSum(sum) {
    var text = fmtSum(sum);
    if (sum.filter(function (t) { return !isZero(t.coef); }).length > 1 || text.charAt(0) === MINUS) return "(" + text + ")";
    return text;
  }

  function tokenize(input) {
    var s = String(input == null ? "" : input).replace(/[\u2212\u2013\u2014]/g, "-");
    if (s.length > 180) throw userError("Use 180 characters or fewer.");
    var tokens = [];
    var i = 0;
    while (i < s.length) {
      var c = s.charAt(i);
      if (c === " " || c === "\t" || c === "\n") { i++; continue; }
      if ("+-*/^()".indexOf(c) >= 0) { tokens.push({ t: c }); i++; continue; }
      if ((c >= "0" && c <= "9") || (c === "." && s.charAt(i + 1) >= "0" && s.charAt(i + 1) <= "9")) {
        var start = i;
        while (i < s.length && s.charAt(i) >= "0" && s.charAt(i) <= "9") i++;
        if (s.charAt(i) === ".") {
          i++;
          var frac = i;
          while (i < s.length && s.charAt(i) >= "0" && s.charAt(i) <= "9") i++;
          if (i === frac) throw userError("A decimal point needs digits after it.");
        }
        tokens.push({ t: "num", text: s.slice(start, i) });
        continue;
      }
      if ((c >= "a" && c <= "z") || (c >= "A" && c <= "Z")) {
        var idStart = i;
        while (i < s.length && /[A-Za-z]/.test(s.charAt(i))) i++;
        var word = s.slice(idStart, i).toLowerCase();
        if (FUNCS[word]) tokens.push({ t: "id", text: word });
        else {
          for (var k = 0; k < word.length; k++) tokens.push({ t: "id", text: word.charAt(k) });
        }
        continue;
      }
      throw userError("Remove the unsupported character and try again.");
    }
    tokens.push({ t: "end" });
    return tokens;
  }

  function parseNumber(text) {
    if (text.indexOf(".") >= 0) {
      var parts = text.split(".");
      var digits = (parts[0] || "0") + (parts[1] || "");
      if (digits.length > 12) throw userError("Use 12 digits or fewer in a coefficient.");
      return rat(BigInt(digits), 10n ** BigInt((parts[1] || "").length));
    }
    if (text.length > 12) throw userError("Use 12 digits or fewer in a coefficient.");
    return rat(BigInt(text), 1n);
  }

  function parseExpr(input, allowed) {
    var tokens = tokenize(input);
    var i = 0;
    function peek() { return tokens[i]; }
    function parseAdd() {
      var node = parseTerm();
      while (peek().t === "+" || peek().t === "-") {
        var op = peek().t;
        i++;
        var rhs = parseTerm();
        if (op === "-") rhs = { t: "mul", args: [num(-1n, 1n), rhs] };
        node = { t: "add", args: [node, rhs] };
      }
      return node;
    }
    function parseTerm() {
      var node = parseTight();
      while (peek().t === "*" || peek().t === "/") {
        var op = peek().t;
        i++;
        var rhs = parseTight();
        if (op === "/") rhs = { t: "pow", base: rhs, exp: -1n };
        node = { t: "mul", args: [node, rhs] };
      }
      return node;
    }
    function parseTight() {
      var node = parsePower();
      while (peek().t === "num" || peek().t === "id" || peek().t === "(") {
        node = { t: "mul", args: [node, parsePower()] };
      }
      return node;
    }
    function parsePower() {
      if (peek().t === "+" || peek().t === "-") {
        var op = peek().t;
        i++;
        var rhs = parsePower();
        return op === "-" ? { t: "mul", args: [num(-1n, 1n), rhs] } : rhs;
      }
      var base = parsePrimary();
      if (peek().t !== "^") return base;
      i++;
      var expNode = parsePower();
      var k = exponentInteger(expNode);
      return { t: "pow", base: base, exp: k };
    }
    function parsePrimary() {
      var tok = peek();
      if (tok.t === "num") {
        i++;
        return { t: "num", v: parseNumber(tok.text) };
      }
      if (tok.t === "id") {
        i++;
        if (FUNCS[tok.text] && peek().t === "(") {
          i++;
          var arg = parseAdd();
          if (peek().t !== ")") throw userError("A function is missing its closing parenthesis.");
          i++;
          return { t: "fn", name: tok.text, arg: arg };
        }
        if (FUNCS[tok.text]) throw userError("Write " + (tok.text === "log" ? "ln" : tok.text) + "(x), with parentheses.");
        if (tok.text === "e") throw userError("Write exp(x) for an exponential. The letter e is not a variable here.");
        if (allowed.indexOf(tok.text) < 0) {
          throw userError("This page is using " + allowed.join(" and ") + " only.");
        }
        return { t: "sym", name: tok.text };
      }
      if (tok.t === "(") {
        i++;
        var inner = parseAdd();
        if (peek().t !== ")") throw userError("A parenthesis is missing.");
        i++;
        return inner;
      }
      throw userError("The expression is incomplete.");
    }
    function exponentInteger(node) {
      var sum = toSum(node);
      if (sum.length !== 1 || sum[0].facs.length || sum[0].coef.d !== 1n) {
        throw userError("Use an integer power, such as x^2 or (x + y)^(" + MINUS + "1).");
      }
      var k = sum[0].coef.n;
      if (k > 12n || k < -12n) throw userError("Keep each power between " + MINUS + "12 and 12.");
      return k;
    }
    if (!String(input == null ? "" : input).trim()) throw userError("Enter an expression.");
    var tree = parseAdd();
    if (peek().t !== "end") throw userError("The expression has an extra symbol at the end.");
    return tree;
  }

  function usesSpecial(sum) {
    var special = false;
    function walk(facs) {
      facs.forEach(function (f) {
        if (f.atom.k === "fn") {
          special = true;
          (f.atom.arg || []).forEach(function (t) { walk(t.facs); });
        } else if (f.atom.k === "sum") {
          f.atom.sum.forEach(function (t) { walk(t.facs); });
        }
      });
    }
    sum.forEach(function (t) { walk(t.facs); });
    return special;
  }

  function evalExact(sum, env) {
    if (usesSpecial(sum)) return null;
    var total = ZERO;
    for (var i = 0; i < sum.length; i++) {
      var c = sum[i].coef;
      for (var j = 0; j < sum[i].facs.length; j++) {
        var fac = sum[i].facs[j];
        var base = null;
        if (fac.atom.k === "var") base = env[fac.atom.name];
        else if (fac.atom.k === "sum") base = evalExact(fac.atom.sum, env);
        if (!base) return null;
        c = rmul(c, powRat(base, fac.exp));
      }
      total = radd(total, c);
    }
    return total;
  }

  function evalFloatAtom(atom, env, exp) {
    var base;
    if (atom.k === "var") base = env[atom.name];
    else if (atom.k === "fn") {
      var arg = evalFloatSum(atom.arg, env);
      if (atom.name === "sin") base = Math.sin(arg);
      else if (atom.name === "cos") base = Math.cos(arg);
      else if (atom.name === "tan") base = Math.tan(arg);
      else if (atom.name === "exp") base = Math.exp(arg);
      else if (atom.name === "ln") base = Math.log(arg);
      else if (atom.name === "sqrt") base = Math.sqrt(arg);
      else return NaN;
    } else base = evalFloatSum(atom.sum, env);
    return Math.pow(base, exp);
  }

  function evalFloatSum(sum, env) {
    var total = 0;
    for (var i = 0; i < sum.length; i++) {
      var c = Number(sum[i].coef.n) / Number(sum[i].coef.d);
      for (var j = 0; j < sum[i].facs.length; j++) {
        c *= evalFloatAtom(sum[i].facs[j].atom, env, Number(sum[i].facs[j].exp));
      }
      total += c;
    }
    return total;
  }

  function fmtValue(sum, env) {
    var exact = evalExact(sum, env.exact);
    if (exact) return { text: fmtRat(exact), exact: true, rat: exact };
    var numv = evalFloatSum(sum, env.float);
    if (!isFinite(numv)) throw userError("The expression is not defined at that point.");
    if (Math.abs(numv) < 1e-10) numv = 0;
    var text = Math.abs(numv) >= 100000 || (numv !== 0 && Math.abs(numv) < 0.0001)
      ? numv.toExponential(6)
      : String(Math.round(numv * 1e8) / 1e8);
    text = text.replace(/-/g, MINUS);
    return { text: text, exact: false };
  }

  function det2(a, b, c, d) {
    return addSums(mulSums(a, d), mulSums([term(rat(-1n, 1n), [])], mulSums(b, c)));
  }

  function det3(m) {
    var term1 = mulSums(m[0][0], det2(m[1][1], m[1][2], m[2][1], m[2][2]));
    var term2 = mulSums(m[0][1], det2(m[1][0], m[1][2], m[2][0], m[2][2]));
    var term3 = mulSums(m[0][2], det2(m[1][0], m[1][1], m[2][0], m[2][1]));
    return addSums(addSums(term1, mulSums([term(rat(-1n, 1n), [])], term2)), term3);
  }

  function compute(componentText, variableCount, point) {
    if (variableCount < 1 || variableCount > 3) throw userError("Use 1, 2, or 3 inputs.");
    if (!componentText.length || componentText.length > 3) throw userError("Use 1, 2, or 3 outputs.");
    var variables = VARS.slice(0, variableCount);
    var trees = componentText.map(function (text, idx) {
      try {
        return parseExpr(text, variables);
      } catch (err) {
        throw userError("Output " + (idx + 1) + ": " + err.message);
      }
    });
    var sums = trees.map(toSum);
    var jacobian = trees.map(function (tree) {
      return variables.map(function (variable) { return toSum(deriv(tree, variable)); });
    });
    var lines = [];
    lines.push("Inputs: " + variables.join(", ") + ".");
    lines.push("Each partial derivative holds the other inputs fixed. Like terms are combined. A product uses the product rule, and a composition uses the chain rule.");
    jacobian.forEach(function (row, r) {
      lines.push("Output " + (r + 1) + " is " + fmtSum(sums[r]) + ".");
      row.forEach(function (entry, c) {
        lines.push("Partial of output " + (r + 1) + " with respect to " + variables[c] + " is " + fmtSum(entry) + ".");
      });
    });
    lines.push("Jacobian matrix, one output per row and one input per column.");
    jacobian.forEach(function (row, r) {
      lines.push("Row " + (r + 1) + ": " + row.map(fmtSum).join(", "));
    });
    var determinant = null;
    if (componentText.length === variableCount) {
      if (variableCount === 1) determinant = jacobian[0][0];
      else if (variableCount === 2) determinant = det2(jacobian[0][0], jacobian[0][1], jacobian[1][0], jacobian[1][1]);
      else determinant = det3(jacobian);
      lines.push("Determinant " + fmtSum(determinant) + ".");
      if (variableCount === 1) lines.push("With one input and one output, the Jacobian determinant is the ordinary derivative.");
      else lines.push("For a square map the determinant is the signed volume scale of the linear approximation. It is not the same object as the matrix.");
    } else {
      lines.push("No determinant. The Jacobian is " + componentText.length + " by " + variableCount + ", so it is not square.");
    }

    var at = null;
    if (point) {
      var exactEnv = {};
      var floatEnv = {};
      variables.forEach(function (name, idx) {
        if (!point[idx]) throw userError("Enter a value for " + name + ".");
        exactEnv[name] = point[idx];
        floatEnv[name] = Number(point[idx].n) / Number(point[idx].d);
      });
      var env = { exact: exactEnv, float: floatEnv };
      lines.push("Evaluated at (" + point.slice(0, variableCount).map(fmtRat).join(", ") + ").");
      var anyDecimal = false;
      var matrixText = jacobian.map(function (row, r) {
        var shown = row.map(function (entry) {
          var value = fmtValue(entry, env);
          if (!value.exact) anyDecimal = true;
          return value.text;
        });
        lines.push("Row " + (r + 1) + " at the point: " + shown.join(", "));
        return shown;
      });
      var detAt = null;
      if (determinant) {
        var detValue = fmtValue(determinant, env);
        if (!detValue.exact) anyDecimal = true;
        detAt = detValue.text;
        lines.push("Determinant at the point: " + detAt + ".");
      }
      if (anyDecimal) lines.push("Where a root, a logarithm, or a trigonometric function was evaluated, the number is numerical, even when it prints as a whole number. A fraction is exact.");
      at = { matrix: matrixText, determinant: detAt, decimal: anyDecimal };
    }

    var summary;
    if (determinant) summary = "Determinant " + fmtSum(determinant) + ".";
    else summary = "Jacobian is " + componentText.length + " by " + variableCount + ".";
    if (at && at.determinant) summary += at.decimal ? " At the point, about " + at.determinant + "." : " At the point, " + at.determinant + ".";

    return {
      variables: variables,
      jacobian: jacobian.map(function (row) { return row.map(fmtSum); }),
      determinant: determinant ? fmtSum(determinant) : null,
      at: at,
      lines: lines,
      summary: summary
    };
  }

  function parsePoint(raw, label) {
    var s = String(raw == null ? "" : raw).trim();
    if (!s) return null;
    s = s.replace(/[\u2212\u2013\u2014]/g, "-").replace(/\s+/g, "");
    var frac = s.match(/^([+-]?)(\d+)\/([+-]?)(\d+)$/);
    if (frac) {
      var n = BigInt((frac[1] === "-" ? "-" : "") + frac[2]);
      var d = BigInt((frac[3] === "-" ? "-" : "") + frac[4]);
      if (d === 0n) throw userError("The denominator cannot be zero for " + label + ".");
      return rat(n, d);
    }
    var dec = s.match(/^([+-]?)(?:(\d+)\.(\d*)|\.(\d+)|(\d+))$/);
    if (!dec) throw userError("Enter an integer, a decimal, or a fraction for " + label + ".");
    var sign = dec[1] === "-" ? -1n : 1n;
    var digits;
    var places;
    if (dec[5] != null) { digits = dec[5]; places = 0; }
    else if (dec[4] != null) { digits = dec[4]; places = dec[4].length; }
    else {
      digits = dec[2] + (dec[3] || "");
      places = (dec[3] || "").length;
      if (!digits) digits = "0";
    }
    return rat(sign * BigInt(digits), 10n ** BigInt(places));
  }

  var DEFAULTS = {
    variables: 2,
    outputs: 2,
    components: ["x^2" + MINUS + "y^2", "2xy", ""],
    point: ["1", "0", ""]
  };

  function boot() {
    var form = document.getElementById("jac-form");
    if (!form) return;
    var varEl = document.getElementById("jac-vars");
    var outEl = document.getElementById("jac-outs");
    var errorEl = document.getElementById("jac-error");
    var resultEl = document.getElementById("jac-result");
    var amountOut = document.getElementById("jac-amount");
    var detailOut = document.getElementById("jac-detail");
    var labels = ["f", "g", "h"];

    function showError(msg) {
      errorEl.textContent = msg;
      errorEl.classList.add("visible");
      resultEl.classList.remove("visible");
    }
    function clearError() {
      errorEl.classList.remove("visible");
      errorEl.textContent = "";
    }
    function sync() {
      var n = parseInt(varEl.value, 10);
      var m = parseInt(outEl.value, 10);
      labels.forEach(function (name, idx) {
        document.getElementById("jac-lab-" + name).hidden = idx >= m;
      });
      ["x", "y", "z"].forEach(function (name, idx) {
        document.getElementById("jac-lab-" + name).hidden = idx >= n;
      });
    }
    function run() {
      clearError();
      sync();
      try {
        var n = parseInt(varEl.value, 10);
        var m = parseInt(outEl.value, 10);
        var comps = [];
        for (var i = 0; i < m; i++) comps.push(document.getElementById("jac-" + labels[i]).value);
        var point = [];
        var any = false;
        ["x", "y", "z"].slice(0, n).forEach(function (name) {
          var raw = document.getElementById("jac-" + name).value;
          if (String(raw).trim()) any = true;
          point.push(parsePoint(raw, name));
        });
        if (any && point.some(function (value) { return !value; })) {
          throw userError("Fill every coordinate of the point, or leave them all blank for a symbolic matrix only.");
        }
        var solved = compute(comps, n, any ? point : null);
        amountOut.textContent = solved.summary;
        detailOut.textContent = solved.lines.join("\n") + "\n\nEducational use only.";
        resultEl.classList.add("visible");
      } catch (err) {
        showError(err.message || "Could not complete the calculation.");
      }
    }
    function load(vars, outs, comps, point) {
      varEl.value = String(vars);
      outEl.value = String(outs);
      labels.forEach(function (name, idx) {
        document.getElementById("jac-" + name).value = comps[idx] || "";
      });
      ["x", "y", "z"].forEach(function (name, idx) {
        document.getElementById("jac-" + name).value = point[idx] || "";
      });
      run();
    }

    varEl.addEventListener("change", run);
    outEl.addEventListener("change", run);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      run();
    });
    document.getElementById("jac-preset-square").addEventListener("click", function () {
      load(2, 2, ["x^2" + MINUS + "y^2", "2xy"], ["1", "0"]);
    });
    document.getElementById("jac-preset-product").addEventListener("click", function () {
      load(2, 2, ["x+y", "x*y"], ["1", "1"]);
    });
    document.getElementById("jac-preset-scalar").addEventListener("click", function () {
      load(2, 1, ["x^2*y"], ["1", "2"]);
    });
    document.getElementById("jac-reset").addEventListener("click", function () {
      load(DEFAULTS.variables, DEFAULTS.outputs, DEFAULTS.components, DEFAULTS.point);
    });
    sync();
    run();
  }

  return {
    compute: compute,
    parseExpr: parseExpr,
    toSum: toSum,
    deriv: deriv,
    fmtSum: fmtSum,
    fmtRat: fmtRat,
    parsePoint: parsePoint,
    MINUS: MINUS,
    rat: rat,
    req: req,
    boot: boot
  };
});
