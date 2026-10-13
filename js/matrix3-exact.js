/* Exact 3 by 3 determinant and inverse. Rational arithmetic, no libraries. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.Matrix3Exact = api;
  if (typeof document !== "undefined") api.boot();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var MINUS = "\u2212";

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

  var ZERO = rat(0n, 1n);
  var ONE = rat(1n, 1n);

  function fmt(a) {
    var sign = a.n < 0n ? MINUS : "";
    var n = a.n < 0n ? -a.n : a.n;
    if (a.d === 1n) return sign + n.toString();
    return sign + n.toString() + "/" + a.d.toString();
  }

  function fmtParen(a) {
    if (a.n < 0n) return "(" + fmt(a) + ")";
    return fmt(a);
  }

  function fmtSub(a, b) {
    if (b.n < 0n) return fmt(a) + " " + MINUS + " (" + fmt(b) + ")";
    return fmt(a) + " " + MINUS + " " + fmt(b);
  }

  function fmtSignedSum(terms) {
    var s = "";
    for (var i = 0; i < terms.length; i++) {
      var t = terms[i];
      if (i === 0) s += fmt(t);
      else if (t.n < 0n) s += " " + MINUS + " " + fmt(neg(t));
      else s += " + " + fmt(t);
    }
    return s;
  }

  var SUB = ["\u2081", "\u2082", "\u2083"];

  function idx(letter, i, j) {
    return letter + SUB[i] + SUB[j];
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

  function minorEntries(A, i, j) {
    var m = [];
    for (var r = 0; r < 3; r++) {
      if (r === i) continue;
      var row = [];
      for (var c = 0; c < 3; c++) {
        if (c === j) continue;
        row.push(A[r][c]);
      }
      m.push(row);
    }
    return m;
  }

  function det2(m) {
    return sub(mul(m[0][0], m[1][1]), mul(m[0][1], m[1][0]));
  }

  function clone3(A) {
    return A.map(function (row) { return row.slice(); });
  }

  function rankOf(A) {
    var M = clone3(A);
    var rank = 0;
    var row = 0;
    for (var col = 0; col < 3 && row < 3; col++) {
      var pivot = -1;
      for (var i = row; i < 3; i++) {
        if (!isZero(M[i][col])) {
          pivot = i;
          break;
        }
      }
      if (pivot < 0) continue;
      if (pivot !== row) {
        var tmp = M[row];
        M[row] = M[pivot];
        M[pivot] = tmp;
      }
      var piv = M[row][col];
      for (var r = row + 1; r < 3; r++) {
        if (isZero(M[r][col])) continue;
        var factor = div(M[r][col], piv);
        for (var c = col; c < 3; c++) {
          M[r][c] = sub(M[r][c], mul(factor, M[row][c]));
        }
      }
      rank += 1;
      row += 1;
    }
    return rank;
  }

  function transpose(A) {
    var T = [];
    for (var i = 0; i < 3; i++) {
      T.push([A[0][i], A[1][i], A[2][i]]);
    }
    return T;
  }

  function matMul(A, B) {
    var C = [];
    for (var i = 0; i < 3; i++) {
      var row = [];
      for (var j = 0; j < 3; j++) {
        var s = ZERO;
        for (var k = 0; k < 3; k++) s = add(s, mul(A[i][k], B[k][j]));
        row.push(s);
      }
      C.push(row);
    }
    return C;
  }

  function isIdentity(P) {
    for (var i = 0; i < 3; i++) {
      for (var j = 0; j < 3; j++) {
        var expect = i === j ? ONE : ZERO;
        if (!eq(P[i][j], expect)) return false;
      }
    }
    return true;
  }

  function formatRows(M) {
    return [0, 1, 2].map(function (i) {
      return "Row " + (i + 1) + ": " + fmt(M[i][0]) + ", " + fmt(M[i][1]) + ", " + fmt(M[i][2]);
    });
  }

  function minorLines(A, i, j, minor, value) {
    var name = idx("M", i, j);
    var lines = [];
    lines.push(
      "Minor " + name + " deletes row " + (i + 1) + " and column " + (j + 1) +
      ", leaving the 2 by 2 entries " + fmt(minor[0][0]) + ", " + fmt(minor[0][1]) +
      "; " + fmt(minor[1][0]) + ", " + fmt(minor[1][1]) + "."
    );
    var ad = mul(minor[0][0], minor[1][1]);
    var bc = mul(minor[0][1], minor[1][0]);
    lines.push(
      name + " = (" + fmt(minor[0][0]) + ")(" + fmt(minor[1][1]) + ") " + MINUS + " (" +
      fmt(minor[0][1]) + ")(" + fmt(minor[1][0]) + ") = " + fmtSub(ad, bc) + " = " + fmt(value) + "."
    );
    return lines;
  }

  function solve(A) {
    if (!A || A.length !== 3 || A.some(function (row) { return !row || row.length !== 3; })) {
      throw new Error("A 3 by 3 matrix needs nine entries.");
    }
    var minors = [];
    var cofactors = [];
    var lines = [];
    lines.push("Cofactor expansion of det(A) along row 1.");
    lines.push("");

    for (var i = 0; i < 3; i++) {
      minors.push([]);
      cofactors.push([]);
      for (var j = 0; j < 3; j++) {
        var minor = minorEntries(A, i, j);
        var value = det2(minor);
        var signPlus = (i + j) % 2 === 0;
        var cof = signPlus ? value : neg(value);
        minors[i].push(value);
        cofactors[i].push(cof);
        if (i === 0) {
          lines = lines.concat(minorLines(A, i, j, minor, value));
          if (signPlus) {
            lines.push(
              "The cofactor sign for row 1, column " + (j + 1) + " is +. So " +
              idx("C", i, j) + " = +(" + fmt(value) + ") = " + fmt(cof) + "."
            );
          } else {
            lines.push(
              "The cofactor sign for row 1, column " + (j + 1) + " is " + MINUS + ". So " +
              idx("C", i, j) + " = " + MINUS + "(" + fmt(value) + ") = " + fmt(cof) + "."
            );
          }
          lines.push("");
        }
      }
    }

    var terms = [0, 1, 2].map(function (j) { return mul(A[0][j], cofactors[0][j]); });
    var det = terms.reduce(function (s, t) { return add(s, t); }, ZERO);
    lines.push(
      "det(A) = " + idx("a", 0, 0) + " " + idx("C", 0, 0) + " + " +
      idx("a", 0, 1) + " " + idx("C", 0, 1) + " + " +
      idx("a", 0, 2) + " " + idx("C", 0, 2) + "."
    );
    for (var j = 0; j < 3; j++) {
      lines.push(
        idx("a", 0, j) + " " + idx("C", 0, j) + " = (" + fmt(A[0][j]) + ")(" + fmt(cofactors[0][j]) + ") = " + fmt(terms[j]) + "."
      );
    }
    lines.push("det(A) = " + fmtSignedSum(terms) + " = " + fmt(det) + ".");
    lines.push("");

    lines.push("The other six minors complete the matrix of minors.");
    lines.push("");
    for (var i2 = 1; i2 < 3; i2++) {
      for (var j2 = 0; j2 < 3; j2++) {
        var minor2 = minorEntries(A, i2, j2);
        lines = lines.concat(minorLines(A, i2, j2, minor2, minors[i2][j2]));
        var signPlus2 = (i2 + j2) % 2 === 0;
        if (signPlus2) {
          lines.push(
            "The cofactor sign for row " + (i2 + 1) + ", column " + (j2 + 1) + " is +. So " +
            idx("C", i2, j2) + " = +(" + fmt(minors[i2][j2]) + ") = " + fmt(cofactors[i2][j2]) + "."
          );
        } else {
          lines.push(
            "The cofactor sign for row " + (i2 + 1) + ", column " + (j2 + 1) + " is " + MINUS + ". So " +
            idx("C", i2, j2) + " = " + MINUS + "(" + fmt(minors[i2][j2]) + ") = " + fmt(cofactors[i2][j2]) + "."
          );
        }
        lines.push("");
      }
    }

    lines.push("Matrix of minors");
    lines = lines.concat(formatRows(minors));
    lines.push("");
    lines.push("Cofactor matrix");
    lines = lines.concat(formatRows(cofactors));
    lines.push("");

    var adjugate = transpose(cofactors);
    lines.push("Adjugate, the transpose of the cofactor matrix");
    lines = lines.concat(formatRows(adjugate));
    lines.push("");

    var singular = isZero(det);
    var inverse = null;
    var product = null;
    if (singular) {
      lines.push(
        "The matrix is singular and has no inverse, because a determinant of zero means the columns are linearly dependent and the linear map collapses volume."
      );
      lines.push("");
    } else {
      inverse = adjugate.map(function (row) {
        return row.map(function (entry) { return div(entry, det); });
      });
      lines.push("Inverse = (1/det(A)) times the adjugate. Here det(A) = " + fmt(det) + ".");
      if (eq(det, ONE)) {
        lines.push("Dividing by 1 leaves the adjugate unchanged, so A inverse equals the adjugate.");
      } else {
        lines.push("Each adjugate entry is divided by " + fmt(det) + ".");
      }
      lines = lines.concat(formatRows(inverse));
      lines.push("");
      product = matMul(A, inverse);
      lines.push("Check: A times A inverse. Each entry is a row of A dotted with a column of the inverse.");
      for (var r = 0; r < 3; r++) {
        for (var c = 0; c < 3; c++) {
          var parts = [];
          for (var k = 0; k < 3; k++) {
            parts.push("(" + fmt(A[r][k]) + ")(" + fmt(inverse[k][c]) + ")");
          }
          lines.push(
            "Row " + (r + 1) + ", column " + (c + 1) + ": " + parts.join(" + ") + " = " + fmt(product[r][c]) + "."
          );
        }
      }
      lines.push("");
      lines = lines.concat(formatRows(product));
      if (isIdentity(product)) {
        lines.push("The product is the identity.");
      } else {
        lines.push("The product is not the identity. Do not trust this inverse.");
      }
      lines.push("");
    }

    var rank = rankOf(A);
    lines.push("Rank is " + rank + ".");
    if (rank === 3) {
      lines.push("The three columns are linearly independent.");
    } else if (rank === 0) {
      lines.push("Every entry is zero, so every column is the zero vector.");
    } else {
      lines.push("The rank is less than 3, so the columns are linearly dependent.");
    }
    lines.push("");
    var trans = transpose(A);
    lines.push("Transpose of A");
    lines = lines.concat(formatRows(trans));

    return {
      det: det,
      minors: minors,
      cofactors: cofactors,
      adjugate: adjugate,
      inverse: inverse,
      product: product,
      rank: rank,
      transpose: trans,
      singular: singular,
      lines: lines
    };
  }

  var DEFAULTS = ["1", "2", "3", "0", "1", "4", "5", "6", "0"];

  function boot() {
    var form = document.getElementById("m33-form");
    if (!form || form.getAttribute("data-m33-ready") === "1") return;
    form.setAttribute("data-m33-ready", "1");
    var errorEl = document.getElementById("m33-error");
    var resultEl = document.getElementById("m33-result");
    var amountOut = document.getElementById("m33-amount");
    var detailOut = document.getElementById("m33-detail");

    function showError(msg) {
      errorEl.textContent = msg;
      errorEl.classList.add("visible");
      resultEl.classList.remove("visible");
    }
    function clearError() {
      errorEl.classList.remove("visible");
      errorEl.textContent = "";
    }

    function readMatrix() {
      var A = [];
      for (var i = 0; i < 3; i++) {
        var row = [];
        for (var j = 0; j < 3; j++) {
          var el = document.getElementById("m33-" + i + j);
          row.push(parseEntry(el.value, "row " + (i + 1) + ", column " + (j + 1)));
        }
        A.push(row);
      }
      return A;
    }

    function run() {
      clearError();
      try {
        var solved = solve(readMatrix());
        var amount = solved.singular
          ? "det(A) = 0. Singular, no inverse."
          : "det(A) = " + fmt(solved.det) + ".";
        amountOut.textContent = amount;
        detailOut.textContent = solved.lines.join("\n") + "\n\nEducational use only.";
        resultEl.classList.add("visible");
      } catch (err) {
        showError(err.message || "Could not complete the calculation.");
      }
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      run();
    });
    var resetBtn = document.getElementById("m33-reset");
    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        for (var k = 0; k < 9; k++) {
          var el = document.getElementById("m33-" + Math.floor(k / 3) + (k % 3));
          if (el) el.value = DEFAULTS[k];
        }
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
    isIdentity: isIdentity,
    boot: boot,
    MINUS: MINUS
  };
});
