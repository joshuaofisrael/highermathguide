/* Exact LU factorization. Rational arithmetic, no libraries. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.LuExact = api;
  if (typeof document !== "undefined") api.boot();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var MINUS = "\u2212";
  var SUB = ["\u2081", "\u2082", "\u2083", "\u2084"];
  var DIGIT_LIMIT = 80;

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
    if (typeof n !== "bigint" || typeof d !== "bigint") {
      throw new Error("Internal arithmetic expected integers.");
    }
    if (d === 0n) throw new Error("Division by zero.");
    if (d < 0n) {
      n = -n;
      d = -d;
    }
    var g = gcd(n, d);
    return { n: n / g, d: d / g };
  }

  function add(a, b) { return rat(a.n * b.d + b.n * a.d, a.d * b.d); }
  function sub(a, b) { return rat(a.n * b.d - b.n * a.d, a.d * b.d); }
  function mul(a, b) { return rat(a.n * b.n, a.d * b.d); }
  function div(a, b) {
    if (b.n === 0n) throw new Error("Division by zero.");
    return rat(a.n * b.d, a.d * b.n);
  }
  function neg(a) { return rat(-a.n, a.d); }
  function isZero(a) { return a.n === 0n; }
  function eq(a, b) { return a.n === b.n && a.d === b.d; }
  function absRat(a) { return a.n < 0n ? neg(a) : a; }
  function gtAbs(a, b) {
    var left = absRat(a);
    var right = absRat(b);
    return left.n * right.d > right.n * left.d;
  }

  var ZERO = rat(0n, 1n);
  var ONE = rat(1n, 1n);

  function guard(a) {
    var n = a.n < 0n ? -a.n : a.n;
    if (n.toString().length > DIGIT_LIMIT || a.d.toString().length > DIGIT_LIMIT) {
      throw new Error("The fractions got too large for this page. Use smaller entries.");
    }
    return a;
  }

  function fmt(a) {
    var sign = a.n < 0n ? MINUS : "";
    var n = a.n < 0n ? -a.n : a.n;
    if (a.d === 1n) return sign + n.toString();
    return sign + n.toString() + "/" + a.d.toString();
  }

  function fmtRow(row) {
    return row.map(fmt).join(", ");
  }

  function fmtMatrix(name, rows) {
    var lines = [name];
    for (var i = 0; i < rows.length; i++) lines.push("Row " + (i + 1) + ": " + fmtRow(rows[i]));
    return lines;
  }

  function clone(A) {
    return A.map(function (row) {
      return row.map(function (x) { return rat(x.n, x.d); });
    });
  }

  function identity(n) {
    var I = [];
    for (var i = 0; i < n; i++) {
      var row = [];
      for (var j = 0; j < n; j++) row.push(i === j ? ONE : ZERO);
      I.push(row);
    }
    return I;
  }

  function matMul(A, B) {
    var n = A.length;
    var m = B[0].length;
    var p = B.length;
    var C = [];
    for (var i = 0; i < n; i++) {
      C[i] = [];
      for (var j = 0; j < m; j++) {
        var s = ZERO;
        for (var k = 0; k < p; k++) s = guard(add(s, mul(A[i][k], B[k][j])));
        C[i][j] = s;
      }
    }
    return C;
  }

  function matsEqual(A, B) {
    for (var i = 0; i < A.length; i++) {
      for (var j = 0; j < A[0].length; j++) {
        if (!eq(A[i][j], B[i][j])) return false;
      }
    }
    return true;
  }

  function parseEntry(raw, label) {
    var where = label ? " for " + label : "";
    var s = String(raw == null ? "" : raw).trim().replace(/\s+/g, "");
    s = s.replace(/[\u2212\u2013\u2014]/g, "-");
    if (!s) throw new Error("Enter an integer, a decimal, or a fraction such as 3/4" + where + ".");
    var frac = s.match(/^([+-]?)(\d+)\/([+-]?)(\d+)$/);
    if (frac) {
      if (frac[2].length > 12 || frac[4].length > 12) throw new Error("Use 12 digits or fewer" + where + ".");
      var n = BigInt(frac[1] + frac[2]);
      var d = BigInt(frac[3] + frac[4]);
      if (d === 0n) throw new Error("The denominator cannot be zero" + where + ".");
      return rat(n, d);
    }
    var dec = s.match(/^([+-]?)(?:(\d+)\.(\d*)|\.(\d+)|(\d+))$/);
    if (!dec) throw new Error("Enter an integer, a decimal, or a fraction such as 3/4" + where + ".");
    var sign = dec[1] === "-" ? -1n : 1n;
    var digits;
    var places;
    if (dec[5] != null) {
      digits = dec[5];
      places = 0;
    } else if (dec[4] != null) {
      digits = dec[4];
      places = dec[4].length;
    } else {
      digits = dec[2] + (dec[3] || "");
      places = (dec[3] || "").length;
      if (!digits.length) digits = "0";
    }
    if (digits.length > 12) throw new Error("Use 12 digits or fewer" + where + ".");
    return rat(sign * BigInt(digits), 10n ** BigInt(places));
  }

  function swapRows(M, a, b) {
    var tmp = M[a];
    M[a] = M[b];
    M[b] = tmp;
  }

  function factor(A, options) {
    options = options || {};
    var pivot = !!options.pivot;
    var b = options.b || null;
    var n = A.length;
    if (n < 2 || n > 4) throw new Error("Use a 2 by 2, 3 by 3, or 4 by 4 matrix.");
    for (var r = 0; r < n; r++) {
      if (!A[r] || A[r].length !== n) throw new Error("A must be square.");
    }
    if (b && b.length !== n) throw new Error("The right hand side needs one entry per row.");

    var lines = [];
    lines.push(pivot
      ? "Partial pivoting is on. Before each column is cleared, the remaining entry of largest absolute value in that column moves to the pivot, and the same exchange is applied to L and to the row order."
      : "No row exchanges. This is the Doolittle pattern: ones on the diagonal of L, multipliers below that diagonal, and U the upper triangular matrix left by elimination.");
    lines.push.apply(lines, fmtMatrix("A", A));

    var U = clone(A);
    var L = identity(n);
    var order = [];
    for (var i = 0; i < n; i++) order.push(i);
    var swaps = 0;

    for (var k = 0; k < n; k++) {
      var pivotRow = k;
      if (pivot) {
        for (var i = k + 1; i < n; i++) {
          if (gtAbs(U[i][k], U[pivotRow][k])) pivotRow = i;
        }
      }
      if (pivot && pivotRow !== k) {
        swapRows(U, k, pivotRow);
        var tmp = order[k];
        order[k] = order[pivotRow];
        order[pivotRow] = tmp;
        for (var col = 0; col < k; col++) {
          var saved = L[k][col];
          L[k][col] = L[pivotRow][col];
          L[pivotRow][col] = saved;
        }
        swaps += 1;
        lines.push("Exchange row " + (k + 1) + " with row " + (pivotRow + 1) + " so the pivot in column " + (k + 1) + " has the largest absolute value still available.");
        lines.push.apply(lines, fmtMatrix("U so far", U));
      }
      if (isZero(U[k][k])) {
        var lower = false;
        for (var i = k + 1; i < n; i++) if (!isZero(U[i][k])) lower = true;
        if (lower && !pivot) {
          throw new Error("The pivot in column " + (k + 1) + " is zero, and a lower entry in that column is not. Turn on partial pivoting. With no row exchanges, this matrix has no Doolittle factorization.");
        }
        throw new Error("The pivot in column " + (k + 1) + " is zero and every entry below it is zero. A is singular, so it has no LU factorization with nonzero pivots.");
      }
      if (k === n - 1) {
        lines.push("Column " + (k + 1) + " pivot is " + fmt(U[k][k]) + ". No rows remain below it.");
        break;
      }
      lines.push("Column " + (k + 1) + " pivot is " + fmt(U[k][k]) + ".");
      for (var i = k + 1; i < n; i++) {
        var multiplier = guard(div(U[i][k], U[k][k]));
        L[i][k] = multiplier;
        lines.push("Multiplier for row " + (i + 1) + " is " + fmt(U[i][k]) + " / " + fmt(U[k][k]) + " = " + fmt(multiplier) + ".");
        for (var j = k; j < n; j++) U[i][j] = guard(sub(U[i][j], mul(multiplier, U[k][j])));
        if (multiplier.n < 0n) {
          lines.push("Row " + (i + 1) + " becomes row " + (i + 1) + " plus " + fmt(neg(multiplier)) + " times row " + (k + 1) + ".");
        } else {
          lines.push("Row " + (i + 1) + " becomes row " + (i + 1) + " minus " + fmt(multiplier) + " times row " + (k + 1) + ".");
        }
        lines.push("Row " + (i + 1) + " is now " + fmtRow(U[i]) + ".");
      }
    }

    for (var i = 0; i < n; i++) {
      for (var j = 0; j < i; j++) U[i][j] = ZERO;
      L[i][i] = ONE;
      for (var j = i + 1; j < n; j++) L[i][j] = ZERO;
    }

    var P = identity(n);
    for (var i = 0; i < n; i++) P[i][order[i]] = ONE;
    for (var i = 0; i < n; i++) {
      for (var j = 0; j < n; j++) if (j !== order[i]) P[i][j] = ZERO;
    }

    var PA = [];
    for (var i = 0; i < n; i++) PA.push(A[order[i]].map(function (x) { return rat(x.n, x.d); }));
    if (!matsEqual(matMul(P, A), PA)) throw new Error("Internal check failed: P was not the row exchange matrix.");
    var LU = matMul(L, U);
    if (!matsEqual(LU, PA)) throw new Error("Internal check failed: L times U did not rebuild PA.");

    lines.push.apply(lines, fmtMatrix("L", L));
    lines.push.apply(lines, fmtMatrix("U", U));
    if (swaps) {
      lines.push("Row order after exchanges, listed as the original row numbers in their new positions: " + order.map(function (idx) { return String(idx + 1); }).join(", ") + ".");
      lines.push.apply(lines, fmtMatrix("P", P));
      lines.push("P records those exchanges. The factorization is P times A = L times U, not A = L times U.");
      lines.push.apply(lines, fmtMatrix("P times A", PA));
    } else {
      lines.push("No rows were exchanged, so P is the identity and A = L times U.");
    }
    lines.push.apply(lines, fmtMatrix("L times U", LU));
    lines.push("Check passed. L times U matches " + (swaps ? "P times A." : "A."));

    var solution = null;
    if (b) {
      var pb = order.map(function (idx) { return rat(b[idx].n, b[idx].d); });
      lines.push(swaps ? "Solve A x = b by solving L y = P b, then U x = y." : "Solve A x = b by solving L y = b, then U x = y.");
      lines.push("Right hand side in elimination order: " + pb.map(fmt).join(", ") + ".");
      var y = [];
      for (var i = 0; i < n; i++) {
        var acc = pb[i];
        var described = fmt(pb[i]);
        for (var j = 0; j < i; j++) {
          acc = sub(acc, mul(L[i][j], y[j]));
          described += " " + MINUS + " (" + fmt(L[i][j]) + ")(" + fmt(y[j]) + ")";
        }
        y.push(guard(acc));
        lines.push("Forward substitution, y" + SUB[i] + " = " + described + " = " + fmt(y[i]) + ".");
      }
      var x = new Array(n);
      for (var i = n - 1; i >= 0; i--) {
        var acc = y[i];
        var described = fmt(y[i]);
        for (var j = i + 1; j < n; j++) {
          acc = sub(acc, mul(U[i][j], x[j]));
          described += " " + MINUS + " (" + fmt(U[i][j]) + ")(" + fmt(x[j]) + ")";
        }
        x[i] = guard(div(acc, U[i][i]));
        lines.push("Back substitution, x" + SUB[i] + " = (" + described + ") / " + fmt(U[i][i]) + " = " + fmt(x[i]) + ".");
      }
      var Ax = matMul(A, x.map(function (value) { return [value]; }));
      for (var i = 0; i < n; i++) {
        if (!eq(Ax[i][0], b[i])) throw new Error("Internal check failed: A times x did not return b.");
      }
      lines.push("Solution: " + x.map(function (value, idx) { return "x" + SUB[idx] + " = " + fmt(value); }).join(", ") + ".");
      lines.push("Check passed. A times x equals b.");
      solution = x;
    }

    var summary = swaps
      ? "P A = L U, with " + swaps + (swaps === 1 ? " row exchange." : " row exchanges.")
      : "A = L U, with no row exchanges.";
    if (solution) summary += " Solution written below.";

    return {
      L: L,
      U: U,
      P: P,
      order: order,
      swaps: swaps,
      solution: solution,
      lines: lines,
      summary: summary
    };
  }

  var DEFAULTS = {
    n: 3,
    pivot: false,
    solve: false,
    values: ["2", "1", "1", "4", MINUS + "6", "0", MINUS + "2", "7", "2"],
    b: ["4", MINUS + "2", "7"]
  };

  function boot() {
    var form = document.getElementById("lu-form");
    if (!form) return;
    var sizeEl = document.getElementById("lu-size");
    var pivotEl = document.getElementById("lu-pivot");
    var solveEl = document.getElementById("lu-solve");
    var grid = document.getElementById("lu-grid");
    var bGrid = document.getElementById("lu-bgrid");
    var bBlock = document.getElementById("lu-bblock");
    var errorEl = document.getElementById("lu-error");
    var resultEl = document.getElementById("lu-result");
    var amountOut = document.getElementById("lu-amount");
    var detailOut = document.getElementById("lu-detail");

    function showError(msg) {
      errorEl.textContent = msg;
      errorEl.classList.add("visible");
      resultEl.classList.remove("visible");
    }
    function clearError() {
      errorEl.classList.remove("visible");
      errorEl.textContent = "";
    }

    function render(n, values, bValues) {
      grid.className = "calc-grid cols-" + n;
      grid.innerHTML = "";
      for (var i = 0; i < n; i++) {
        for (var j = 0; j < n; j++) {
          var id = "lu-" + i + "-" + j;
          var label = document.createElement("label");
          label.setAttribute("for", id);
          label.appendChild(document.createTextNode("a" + SUB[i] + SUB[j] + " "));
          var input = document.createElement("input");
          input.id = id;
          input.type = "text";
          input.setAttribute("inputmode", "text");
          input.setAttribute("autocomplete", "off");
          input.setAttribute("spellcheck", "false");
          input.setAttribute("aria-label", "Row " + (i + 1) + ", column " + (j + 1));
          var idx = i * n + j;
          input.value = values && values[idx] != null ? values[idx] : "0";
          label.appendChild(input);
          grid.appendChild(label);
        }
      }
      bGrid.className = "calc-grid cols-" + n;
      bGrid.innerHTML = "";
      for (var i = 0; i < n; i++) {
        var idb = "lu-b-" + i;
        var labelb = document.createElement("label");
        labelb.setAttribute("for", idb);
        labelb.appendChild(document.createTextNode("b" + SUB[i] + " "));
        var inputb = document.createElement("input");
        inputb.id = idb;
        inputb.type = "text";
        inputb.setAttribute("inputmode", "text");
        inputb.setAttribute("autocomplete", "off");
        inputb.setAttribute("spellcheck", "false");
        inputb.setAttribute("aria-label", "Right hand side entry " + (i + 1));
        inputb.value = bValues && bValues[i] != null ? bValues[i] : "0";
        labelb.appendChild(inputb);
        bGrid.appendChild(labelb);
      }
      bBlock.hidden = !solveEl.checked;
    }

    function readA() {
      var n = parseInt(sizeEl.value, 10);
      var A = [];
      for (var i = 0; i < n; i++) {
        var row = [];
        for (var j = 0; j < n; j++) {
          var el = document.getElementById("lu-" + i + "-" + j);
          row.push(parseEntry(el ? el.value : "", "row " + (i + 1) + ", column " + (j + 1)));
        }
        A.push(row);
      }
      return A;
    }

    function readB() {
      if (!solveEl.checked) return null;
      var n = parseInt(sizeEl.value, 10);
      var b = [];
      for (var i = 0; i < n; i++) {
        var el = document.getElementById("lu-b-" + i);
        b.push(parseEntry(el ? el.value : "", "right hand side entry " + (i + 1)));
      }
      return b;
    }

    function run() {
      clearError();
      bBlock.hidden = !solveEl.checked;
      try {
        var solved = factor(readA(), { pivot: pivotEl.value === "1", b: readB() });
        amountOut.textContent = solved.summary;
        detailOut.textContent = solved.lines.join("\n") + "\n\nEducational use only.";
        resultEl.classList.add("visible");
      } catch (err) {
        showError(err.message || "Could not complete the calculation.");
      }
    }

    sizeEl.addEventListener("change", function () {
      render(parseInt(sizeEl.value, 10), null, null);
      run();
    });
    pivotEl.addEventListener("change", run);
    solveEl.addEventListener("change", run);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      run();
    });

    function load(n, values, b, pivot, solve) {
      sizeEl.value = String(n);
      pivotEl.value = pivot ? "1" : "0";
      solveEl.checked = !!solve;
      render(n, values, b);
      run();
    }

    document.getElementById("lu-preset-book").addEventListener("click", function () {
      load(3, DEFAULTS.values, DEFAULTS.b, false, true);
    });
    document.getElementById("lu-preset-swap").addEventListener("click", function () {
      load(2, ["0", "1", "2", "3"], ["1", "5"], true, false);
    });
    document.getElementById("lu-preset-singular").addEventListener("click", function () {
      load(2, ["1", "2", "2", "4"], ["0", "0"], false, false);
    });
    document.getElementById("lu-reset").addEventListener("click", function () {
      load(DEFAULTS.n, DEFAULTS.values, DEFAULTS.b, DEFAULTS.pivot, DEFAULTS.solve);
    });

    render(DEFAULTS.n, DEFAULTS.values, DEFAULTS.b);
    run();
  }

  return {
    parseEntry: parseEntry,
    factor: factor,
    fmt: fmt,
    eq: eq,
    isZero: isZero,
    matMul: matMul,
    ZERO: ZERO,
    ONE: ONE,
    MINUS: MINUS,
    DEFAULTS: DEFAULTS,
    boot: boot
  };
});
