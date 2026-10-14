/* Exact reduced row echelon form. Rational arithmetic, no libraries. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.RrefExact = api;
  if (typeof document !== "undefined") api.boot();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var MINUS = "\u2212";
  var SUB = ["\u2081", "\u2082", "\u2083", "\u2084", "\u2085", "\u2086"];
  var PARAMS = ["t", "s", "r", "u", "v"];

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

  var ZERO = rat(0n, 1n);
  var ONE = rat(1n, 1n);

  function fmt(a) {
    var sign = a.n < 0n ? MINUS : "";
    var n = a.n < 0n ? -a.n : a.n;
    if (a.d === 1n) return sign + n.toString();
    return sign + n.toString() + "/" + a.d.toString();
  }

  function fmtTerm(coef, symbol) {
    var mag = absRat(coef);
    if (eq(mag, ONE)) return symbol;
    if (mag.d === 1n) return fmt(mag) + symbol;
    return "(" + fmt(mag) + ")" + symbol;
  }

  function fmtAffine(constant, parts) {
    var items = [];
    if (!isZero(constant) || parts.length === 0) {
      items.push({ negative: constant.n < 0n, body: fmt(absRat(constant)) });
    }
    for (var i = 0; i < parts.length; i++) {
      if (isZero(parts[i].coef)) continue;
      items.push({
        negative: parts[i].coef.n < 0n,
        body: fmtTerm(parts[i].coef, parts[i].symbol)
      });
    }
    if (!items.length) return "0";
    var s = items[0].negative ? MINUS + items[0].body : items[0].body;
    for (var k = 1; k < items.length; k++) {
      s += items[k].negative ? " " + MINUS + " " + items[k].body : " + " + items[k].body;
    }
    return s;
  }

  function englishList(items) {
    if (items.length === 0) return "";
    if (items.length === 1) return String(items[0]);
    if (items.length === 2) return items[0] + " and " + items[1];
    return items.slice(0, -1).join(", ") + ", and " + items[items.length - 1];
  }

  function xName(index) {
    return "x" + SUB[index];
  }

  function parseEntry(raw, label) {
    var where = label ? " for " + label : "";
    var s = String(raw == null ? "" : raw).trim().replace(/\s+/g, "");
    s = s.replace(/[\u2212\u2013\u2014]/g, "-");
    if (!s) throw new Error("Enter an integer, a decimal, or a fraction such as 3/4" + where + ".");
    var frac = s.match(/^([+-]?)(\d+)\/([+-]?)(\d+)$/);
    if (frac) {
      if (frac[2].length > 40 || frac[4].length > 40) {
        throw new Error("Use 40 digits or fewer" + where + ".");
      }
      var n = BigInt(frac[1] + frac[2]);
      var d = BigInt(frac[3] + frac[4]);
      if (d === 0n) throw new Error("The denominator cannot be zero" + where + ".");
      return rat(n, d);
    }
    var dec = s.match(/^([+-]?)(?:(\d+)\.(\d*)|\.(\d+)|(\d+))$/);
    if (!dec) {
      throw new Error("Enter an integer, a decimal, or a fraction such as 3/4" + where + ".");
    }
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
      if (digits.length === 0) digits = "0";
    }
    if (digits.length > 40) throw new Error("Use 40 digits or fewer" + where + ".");
    var den = 10n ** BigInt(places);
    return rat(sign * BigInt(digits), den);
  }

  function cloneMatrix(M) {
    return M.map(function (row) { return row.slice(); });
  }

  function formatMatrix(M, augmented) {
    var cols = M[0].length;
    var lines = [];
    for (var i = 0; i < M.length; i++) {
      var left = [];
      for (var j = 0; j < cols; j++) {
        if (augmented && j === cols - 1) break;
        left.push(fmt(M[i][j]));
      }
      var line = "Row " + (i + 1) + ": " + left.join(", ");
      if (augmented) line += " | " + fmt(M[i][cols - 1]);
      lines.push(line);
    }
    return lines;
  }

  function formatRowPhrase(row, augmented) {
    var cols = row.length;
    var left = [];
    for (var j = 0; j < cols; j++) {
      if (augmented && j === cols - 1) break;
      left.push(fmt(row[j]));
    }
    var phrase = left.join(", ");
    if (augmented) phrase += " | " + fmt(row[cols - 1]);
    return phrase;
  }

  function solve(M, options) {
    var augmented = !!(options && options.augmented);
    if (!M || !M.length || !M[0] || !M[0].length) {
      throw new Error("Enter a matrix.");
    }
    var rowCount = M.length;
    var colCount = M[0].length;
    for (var r0 = 0; r0 < rowCount; r0++) {
      if (!M[r0] || M[r0].length !== colCount) {
        throw new Error("Each row needs the same number of entries.");
      }
    }
    if (augmented && colCount < 2) {
      throw new Error("An augmented matrix needs a column of constants.");
    }

    var A = cloneMatrix(M);
    var lines = [];
    var steps = [];
    lines.push("Starting matrix");
    lines = lines.concat(formatMatrix(A, augmented));
    lines.push("");

    var stepNo = 0;
    function record(sentence) {
      stepNo += 1;
      var text = stepNo + ". " + sentence;
      var snapshot = cloneMatrix(A);
      steps.push({ n: stepNo, text: text, matrix: snapshot });
      lines.push(text);
      lines = lines.concat(formatMatrix(snapshot, augmented));
      lines.push("");
    }

    var pivotCols = [];
    var pivotRow = 0;
    for (var col = 0; col < colCount && pivotRow < rowCount; col++) {
      var swapFrom = -1;
      for (var i = pivotRow; i < rowCount; i++) {
        if (!isZero(A[i][col])) {
          swapFrom = i;
          break;
        }
      }
      if (swapFrom < 0) continue;
      if (swapFrom !== pivotRow) {
        var tmp = A[pivotRow];
        A[pivotRow] = A[swapFrom];
        A[swapFrom] = tmp;
        record(
          "Swap row " + (pivotRow + 1) + " and row " + (swapFrom + 1) +
          ", because row " + (pivotRow + 1) + " has a zero in column " + (col + 1) +
          " and row " + (swapFrom + 1) + " does not."
        );
      }
      if (!eq(A[pivotRow][col], ONE)) {
        var scale = div(ONE, A[pivotRow][col]);
        for (var c = 0; c < colCount; c++) {
          A[pivotRow][c] = mul(A[pivotRow][c], scale);
        }
        record(
          "Multiply row " + (pivotRow + 1) + " by " + fmt(scale) +
          " so the pivot in column " + (col + 1) + " is 1."
        );
      }
      for (var rr = 0; rr < rowCount; rr++) {
        if (rr === pivotRow || isZero(A[rr][col])) continue;
        var addend = neg(A[rr][col]);
        for (var cc = 0; cc < colCount; cc++) {
          A[rr][cc] = add(A[rr][cc], mul(addend, A[pivotRow][cc]));
        }
        record(
          "Add " + fmt(addend) + " times row " + (pivotRow + 1) +
          " to row " + (rr + 1) + " to clear the entry in column " + (col + 1) + "."
        );
      }
      pivotCols.push(col);
      pivotRow += 1;
    }

    if (stepNo === 0) {
      lines.push("No row operation is needed. The matrix is already in reduced row echelon form.");
      lines.push("");
    }

    lines.push("Reduced row echelon form");
    lines = lines.concat(formatMatrix(A, augmented));
    lines.push("");

    var rank = pivotCols.length;
    lines.push("Rank is " + rank + ".");
    var pivotNames = pivotCols.map(function (c) { return String(c + 1); });
    if (pivotNames.length === 0) {
      lines.push("There is no pivot column. Every entry is zero.");
    } else if (pivotNames.length === 1) {
      lines.push("Pivot column: " + pivotNames[0] + ".");
    } else {
      lines.push("Pivot columns: " + englishList(pivotNames) + ".");
    }

    var varCount = augmented ? colCount - 1 : colCount;
    var coeffPivots = pivotCols.filter(function (c) { return c < varCount; });
    var constantPivot = augmented && pivotCols.indexOf(colCount - 1) !== -1;
    var status = augmented ? "matrix" : "matrix";
    var inconsistentRow = null;
    var variables = [];
    var free = [];

    if (!augmented) {
      lines.push("The last column was not treated as constants, so this result is the reduced matrix, the rank, and the pivot columns.");
    } else if (constantPivot) {
      status = "none";
      inconsistentRow = pivotCols.indexOf(colCount - 1);
      lines.push(
        "Column " + colCount + " is the constants and is a pivot column. The coefficient matrix has rank " +
        coeffPivots.length + "."
      );
      lines.push("The system has no solution.");
      lines.push(
        "Row " + (inconsistentRow + 1) + " of the reduced matrix reads " +
        formatRowPhrase(A[inconsistentRow], true) + "."
      );
      lines.push(
        "That row says 0 = " + fmt(A[inconsistentRow][colCount - 1]) +
        ", so the equations contradict each other."
      );
    } else if (coeffPivots.length === varCount) {
      status = "unique";
      lines.push("The system has a unique solution.");
      for (var j = 0; j < varCount; j++) {
        var prow = pivotCols.indexOf(j);
        var value = A[prow][colCount - 1];
        variables.push({
          index: j,
          free: false,
          constant: value,
          terms: [],
          text: xName(j) + " = " + fmt(value)
        });
        lines.push(xName(j) + " = " + fmt(value));
      }
    } else {
      status = "infinite";
      for (var f = 0; f < varCount; f++) {
        if (pivotCols.indexOf(f) === -1) free.push(f);
      }
      lines.push("The system has infinitely many solutions.");
      var freeNames = free.map(xName);
      if (free.length === 1) {
        lines.push("Free variable: " + freeNames[0] + ".");
      } else {
        lines.push("Free variables: " + englishList(freeNames) + ".");
      }
      var assigns = free.map(function (col, i) { return xName(col) + " = " + PARAMS[i]; });
      var paramNames = PARAMS.slice(0, free.length);
      var verb = paramNames.length === 1 ? "is" : "are";
      var noun = paramNames.length === 1 ? "any real number" : "any real numbers";
      lines.push(
        "Let " + englishList(assigns) + ", where " + englishList(paramNames) + " " + verb + " " + noun + "."
      );
      for (var v = 0; v < varCount; v++) {
        var pivotAt = pivotCols.indexOf(v);
        var constant;
        var parts = [];
        if (pivotAt === -1) {
          var pIndex = free.indexOf(v);
          constant = ZERO;
          parts.push({ coef: ONE, symbol: PARAMS[pIndex] });
        } else {
          constant = A[pivotAt][colCount - 1];
          for (var fi = 0; fi < free.length; fi++) {
            var coef = neg(A[pivotAt][free[fi]]);
            if (!isZero(coef)) parts.push({ coef: coef, symbol: PARAMS[fi] });
          }
        }
        var rendered = xName(v) + " = " + fmtAffine(constant, parts);
        variables.push({
          index: v,
          free: pivotAt === -1,
          constant: constant,
          terms: parts,
          text: rendered
        });
        lines.push(rendered);
      }
    }

    var summary;
    if (!augmented) {
      summary = "Rank is " + rank + ".";
    } else if (status === "none") {
      summary = "No solution.";
    } else if (status === "unique") {
      summary = "Unique solution: " + variables.map(function (item) { return item.text; }).join(", ") + ".";
    } else if (free.length === 1) {
      summary = "Infinitely many solutions. One free variable.";
    } else {
      summary = "Infinitely many solutions. " + free.length + " free variables.";
    }

    return {
      rref: A,
      rank: rank,
      pivotColumns: pivotCols.map(function (c) { return c + 1; }),
      coefficientRank: augmented ? coeffPivots.length : null,
      augmented: augmented,
      status: status,
      inconsistentRow: inconsistentRow === null ? null : inconsistentRow + 1,
      variables: variables,
      free: free.map(function (col, i) { return { index: col + 1, parameter: PARAMS[i] }; }),
      summary: summary,
      steps: steps,
      lines: lines
    };
  }

  var DEFAULTS = {
    rows: 3,
    cols: 4,
    augmented: true,
    values: ["0", "1", "1", "5", "1", "1", "1", "6", "1", "2", "\u22121", "2"]
  };

  function entryLabel(row, col, cols, augmented) {
    if (augmented && col === cols - 1) return "b" + SUB[row];
    return "a" + SUB[row] + SUB[col];
  }

  function boot() {
    var form = document.getElementById("rref-form");
    if (!form || form.getAttribute("data-rref-ready") === "1") return;
    form.setAttribute("data-rref-ready", "1");

    var rowsEl = document.getElementById("rref-rows");
    var colsEl = document.getElementById("rref-cols");
    var augEl = document.getElementById("rref-aug");
    var grid = document.getElementById("rref-grid");
    var errorEl = document.getElementById("rref-error");
    var resultEl = document.getElementById("rref-result");
    var amountOut = document.getElementById("rref-amount");
    var detailOut = document.getElementById("rref-detail");

    function showError(msg) {
      errorEl.textContent = msg;
      errorEl.classList.add("visible");
      resultEl.classList.remove("visible");
    }
    function clearError() {
      errorEl.classList.remove("visible");
      errorEl.textContent = "";
    }

    function currentValues() {
      var rows = grid.querySelectorAll("input");
      var values = [];
      rows.forEach(function (input) { values.push(input.value); });
      return values;
    }

    function renderGrid(rows, cols, augmented, values) {
      grid.className = "calc-grid cols-" + cols;
      grid.setAttribute("data-rows", String(rows));
      grid.setAttribute("data-cols", String(cols));
      grid.innerHTML = "";
      for (var i = 0; i < rows; i++) {
        for (var j = 0; j < cols; j++) {
          var id = "rref-" + i + "-" + j;
          var label = document.createElement("label");
          label.setAttribute("for", id);
          label.appendChild(document.createTextNode(entryLabel(i, j, cols, augmented) + " "));
          var input = document.createElement("input");
          input.id = id;
          input.type = "text";
          input.setAttribute("inputmode", "text");
          input.setAttribute("autocomplete", "off");
          input.setAttribute("spellcheck", "false");
          input.setAttribute("aria-label", "Row " + (i + 1) + ", column " + (j + 1));
          var idx = i * cols + j;
          input.value = values && values[idx] != null ? values[idx] : "0";
          label.appendChild(input);
          grid.appendChild(label);
        }
      }
    }

    function readMatrix() {
      var rows = parseInt(rowsEl.value, 10);
      var cols = parseInt(colsEl.value, 10);
      var A = [];
      for (var i = 0; i < rows; i++) {
        var row = [];
        for (var j = 0; j < cols; j++) {
          var el = document.getElementById("rref-" + i + "-" + j);
          row.push(parseEntry(el ? el.value : "", "row " + (i + 1) + ", column " + (j + 1)));
        }
        A.push(row);
      }
      return A;
    }

    function run() {
      clearError();
      try {
        var solved = solve(readMatrix(), { augmented: augEl.checked });
        amountOut.textContent = solved.summary;
        detailOut.textContent = solved.lines.join("\n") + "\n\nEducational use only.";
        resultEl.classList.add("visible");
      } catch (err) {
        showError(err.message || "Could not complete the calculation.");
      }
    }

    function resize(keepValues) {
      var rows = parseInt(rowsEl.value, 10);
      var cols = parseInt(colsEl.value, 10);
      var oldRows = parseInt(grid.getAttribute("data-rows") || String(rows), 10);
      var oldCols = parseInt(grid.getAttribute("data-cols") || String(cols), 10);
      var previous = keepValues ? currentValues() : null;
      var carried = null;
      if (previous) {
        carried = [];
        for (var i = 0; i < rows; i++) {
          for (var j = 0; j < cols; j++) {
            if (i < oldRows && j < oldCols && previous[i * oldCols + j] != null) {
              carried.push(previous[i * oldCols + j]);
            } else {
              carried.push("0");
            }
          }
        }
      }
      renderGrid(rows, cols, augEl.checked, carried);
    }

    rowsEl.addEventListener("change", function () { resize(true); run(); });
    colsEl.addEventListener("change", function () { resize(true); run(); });
    augEl.addEventListener("change", function () {
      resize(true);
      run();
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      run();
    });
    var resetBtn = document.getElementById("rref-reset");
    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        rowsEl.value = String(DEFAULTS.rows);
        colsEl.value = String(DEFAULTS.cols);
        augEl.checked = DEFAULTS.augmented;
        renderGrid(DEFAULTS.rows, DEFAULTS.cols, DEFAULTS.augmented, DEFAULTS.values);
        run();
      });
    }
    run();
  }

  return {
    parseEntry: parseEntry,
    solve: solve,
    fmt: fmt,
    eq: eq,
    add: add,
    sub: sub,
    mul: mul,
    isZero: isZero,
    ZERO: ZERO,
    ONE: ONE,
    boot: boot,
    MINUS: MINUS,
    DEFAULTS: DEFAULTS
  };
});
