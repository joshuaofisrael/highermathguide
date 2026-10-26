/* Exact Gram Schmidt process. Rational arithmetic, no libraries. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.GramSchmidt = api;
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

  function fmtVec(v) {
    return "(" + v.map(fmt).join(", ") + ")";
  }

  function parseEntry(raw, label) {
    var where = label ? " for " + label : "";
    var s = String(raw == null ? "" : raw).trim().replace(/\s+/g, "");
    s = s.replace(/[\u2212\u2013\u2014]/g, "-");
    if (!s) throw new Error("Enter an integer, a decimal, or a fraction such as 3/4" + where + ".");
    var frac = s.match(/^([+-]?)(\d+)\/([+-]?)(\d+)$/);
    if (frac) {
      if (frac[2].length > 12 || frac[4].length > 12) {
        throw new Error("Use 12 digits or fewer" + where + ".");
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
    if (digits.length > 12) throw new Error("Use 12 digits or fewer" + where + ".");
    var den = 10n ** BigInt(places);
    return rat(sign * BigInt(digits), den);
  }

  function dot(a, b) {
    var s = ZERO;
    for (var i = 0; i < a.length; i++) s = guard(add(s, mul(a[i], b[i])));
    return s;
  }

  function scale(v, c) {
    return v.map(function (x) { return guard(mul(x, c)); });
  }

  function subVec(a, b) {
    return a.map(function (x, i) { return guard(sub(x, b[i])); });
  }

  function isZeroVec(v) {
    for (var i = 0; i < v.length; i++) if (!isZero(v[i])) return false;
    return true;
  }

  function cloneVec(v) {
    return v.map(function (x) { return rat(x.n, x.d); });
  }

  function isqrtFloor(n) {
    if (n < 0n) return null;
    if (n < 2n) return n;
    var x = n;
    var y = (x + 1n) / 2n;
    while (y < x) {
      x = y;
      y = (x + n / x) / 2n;
    }
    return x;
  }

  function splitSquare(n) {
    if (n < 0n) throw new Error("Internal square split expected a nonnegative integer.");
    if (n === 0n) return { mul: 0n, rad: 1n };
    if (n > 10n ** 14n) return null;
    var mul = 1n;
    var rest = n;
    var p = 2n;
    while (p * p <= rest) {
      var count = 0n;
      while (rest % p === 0n) {
        rest /= p;
        count += 1n;
      }
      if (count >= 2n) {
        var pairs = count / 2n;
        for (var i = 0n; i < pairs; i++) mul *= p;
      }
      p = p === 2n ? 3n : p + 2n;
    }
    return { mul: mul, rad: rest };
  }

  function unitFrom(u) {
    var sq = dot(u, u);
    if (isZero(sq)) return null;
    var splitN = splitSquare(sq.n);
    var splitD = splitSquare(sq.d);
    if (!splitN || !splitD) {
      return {
        coefs: u.map(function (c) { return c; }),
        rad: null,
        sq: sq,
        unsimplified: true
      };
    }
    var mul = splitN.mul * splitD.mul;
    var rad = splitN.rad * splitD.rad;
    var coefs = u.map(function (c) {
      return guard(rat(c.n * mul, c.d * sq.n));
    });
    return { coefs: coefs, rad: rad, sq: sq, unsimplified: false };
  }

  function fmtRadicalCoef(coef, rad) {
    if (isZero(coef) || rad === 1n || rad == null) return fmt(coef);
    var neg = coef.n < 0n;
    var n = coef.n < 0n ? -coef.n : coef.n;
    var d = coef.d;
    var body;
    if (n === 1n && d === 1n) body = "sqrt(" + rad.toString() + ")";
    else if (d === 1n) body = n.toString() + " sqrt(" + rad.toString() + ")";
    else if (n === 1n) body = "sqrt(" + rad.toString() + ")/" + d.toString();
    else body = n.toString() + " sqrt(" + rad.toString() + ")/" + d.toString();
    return neg ? MINUS + body : body;
  }

  function fmtUnit(unit) {
    if (!unit) return "none";
    if (unit.unsimplified) {
      return fmtVec(unit.coefs) + " / sqrt(" + fmt(unit.sq) + ")";
    }
    return "(" + unit.coefs.map(function (c) { return fmtRadicalCoef(c, unit.rad); }).join(", ") + ")";
  }

  function fmtRows(name, rows) {
    var lines = [name];
    for (var i = 0; i < rows.length; i++) lines.push("Row " + (i + 1) + ": " + rows[i].join(", "));
    return lines;
  }

  function process(vectors, options) {
    options = options || {};
    var withUnits = options.units !== false;
    if (!vectors.length) throw new Error("Enter at least two vectors.");
    var dim = vectors[0].length;
    if (dim < 2 || dim > 4) throw new Error("Use dimension 2, 3, or 4.");
    if (vectors.length < 2 || vectors.length > 4) throw new Error("Use 2, 3, or 4 vectors.");
    for (var r = 0; r < vectors.length; r++) {
      if (vectors[r].length !== dim) throw new Error("Every vector needs the same number of entries.");
    }

    var lines = [];
    lines.push("Input vectors, in the order they will be processed.");
    for (var i = 0; i < vectors.length; i++) {
      lines.push("v" + SUB[i] + " = " + fmtVec(vectors[i]));
    }
    lines.push("The classical Gram Schmidt process subtracts projections onto the orthogonal vectors already built. Exact fractions make the order agree with the modified process. Decimal arithmetic can make those two orders differ, and this page does not use decimals.");

    var orthogonal = [];
    for (var i = 0; i < vectors.length; i++) {
      var running = cloneVec(vectors[i]);
      lines.push("Vector " + (i + 1) + " starts as " + fmtVec(vectors[i]) + ".");
      for (var j = 0; j < orthogonal.length; j++) {
        var prev = orthogonal[j];
        if (isZeroVec(prev)) {
          lines.push("Direction " + (j + 1) + " is the zero vector, so there is no projection to subtract.");
          continue;
        }
        var numer = dot(vectors[i], prev);
        var denom = dot(prev, prev);
        var coef = div(numer, denom);
        var proj = scale(prev, coef);
        lines.push("Projection of v" + SUB[i] + " onto orthogonal vector " + (j + 1) + ".");
        lines.push("Dot product " + fmt(numer) + ", squared length " + fmt(denom) + ", coefficient " + fmt(coef) + ".");
        lines.push("Projection vector " + fmtVec(proj) + ".");
        running = subVec(running, proj);
        lines.push("After subtracting that projection, the running vector is " + fmtVec(running) + ".");
      }
      if (isZeroVec(running)) {
        lines.push("The remainder is the zero vector. v" + SUB[i] + " is in the span of the earlier vectors, so the set is linearly dependent.");
      } else {
        lines.push("Orthogonal vector " + (i + 1) + " is " + fmtVec(running) + ".");
        lines.push("Squared length " + fmt(dot(running, running)) + ".");
      }
      orthogonal.push(running);
    }

    for (var a = 0; a < orthogonal.length; a++) {
      for (var b = a + 1; b < orthogonal.length; b++) {
        if (!isZero(dot(orthogonal[a], orthogonal[b]))) {
          throw new Error("Internal check failed: two orthogonal vectors have a nonzero dot product.");
        }
      }
    }

    var units = orthogonal.map(unitFrom);
    var independent = orthogonal.filter(function (v) { return !isZeroVec(v); }).length;
    var dependent = independent < vectors.length;

    if (withUnits) {
      lines.push("Unit vectors divide each nonzero orthogonal vector by the square root of its squared length. A zero remainder has no direction, so it has no unit vector.");
      for (var u = 0; u < units.length; u++) {
        if (!units[u]) lines.push("Unit vector " + (u + 1) + ": none, because the orthogonal vector is zero.");
        else lines.push("Unit vector " + (u + 1) + " is " + fmtUnit(units[u]) + ".");
      }
    }

    var qr = null;
    if (withUnits && !dependent) {
      var rads = units.map(function (u) { return u.rad; });
      if (rads.some(function (rad) { return rad == null; })) {
        lines.push("A squared length was too large to simplify, so the QR factors are left in the unit vector form above.");
      } else {
        var qRows = [];
        for (var row = 0; row < dim; row++) {
          qRows.push(units.map(function (u) { return fmtRadicalCoef(u.coefs[row], u.rad); }));
        }
        var rRows = [];
        for (var i = 0; i < vectors.length; i++) {
          var rRow = [];
          for (var j = 0; j < vectors.length; j++) {
            if (i > j) {
              var stray = ZERO;
              for (var t = 0; t < dim; t++) stray = add(stray, mul(units[i].coefs[t], vectors[j][t]));
              if (!isZero(stray)) throw new Error("Internal check failed: R was not upper triangular.");
              rRow.push("0");
            } else {
              var coef = ZERO;
              for (var t = 0; t < dim; t++) coef = guard(add(coef, mul(units[i].coefs[t], vectors[j][t])));
              rRow.push(fmtRadicalCoef(coef, units[i].rad));
            }
          }
          rRows.push(rRow);
        }
        for (var comp = 0; comp < dim; comp++) {
          for (var j = 0; j < vectors.length; j++) {
            var sum = ZERO;
            for (var i = 0; i <= j; i++) {
              var cij = ZERO;
              for (var t = 0; t < dim; t++) cij = add(cij, mul(units[i].coefs[t], vectors[j][t]));
              sum = guard(add(sum, mul(mul(cij, units[i].coefs[comp]), rat(units[i].rad, 1n))));
            }
            if (!eq(sum, vectors[j][comp])) {
              throw new Error("Internal check failed: QR did not rebuild the input.");
            }
          }
        }
        lines.push("QR factorization. The columns of Q are the unit vectors. R is upper triangular, and column j of the input is Q times column j of R. The diagonal entries of R are the lengths of the orthogonal vectors.");
        lines.push.apply(lines, fmtRows("Q", qRows));
        lines.push.apply(lines, fmtRows("R", rRows));
        lines.push("Check passed: Q times R rebuilds the input matrix whose columns are v" + SUB[0] + " through v" + SUB[vectors.length - 1] + ".");
        qr = { qRows: qRows, rRows: rRows };
      }
    } else if (withUnits && dependent) {
      lines.push("QR factors need one nonzero direction per input vector. This set is linearly dependent, so the page stops after the orthogonal vectors and the unit vectors that exist.");
    }

    var summary;
    if (dependent) {
      summary = "Linearly dependent. Nonzero orthogonal directions: " + independent + ".";
    } else if (withUnits) {
      summary = "Orthonormal set of " + independent + " vectors, with QR factors.";
    } else {
      summary = "Orthogonal set of " + independent + " vectors.";
    }

    return {
      orthogonal: orthogonal,
      units: units,
      dependent: dependent,
      independent: independent,
      lines: lines,
      summary: summary,
      qr: qr
    };
  }

  var DEFAULTS = {
    dim: 3,
    count: 3,
    units: true,
    values: ["1", "1", "0", "1", "0", "1", "0", "1", "1"]
  };

  function boot() {
    var form = document.getElementById("gs-form");
    if (!form) return;
    var dimEl = document.getElementById("gs-dim");
    var countEl = document.getElementById("gs-count");
    var unitsEl = document.getElementById("gs-units");
    var grid = document.getElementById("gs-grid");
    var errorEl = document.getElementById("gs-error");
    var resultEl = document.getElementById("gs-result");
    var amountOut = document.getElementById("gs-amount");
    var detailOut = document.getElementById("gs-detail");

    function showError(msg) {
      errorEl.textContent = msg;
      errorEl.classList.add("visible");
      resultEl.classList.remove("visible");
    }
    function clearError() {
      errorEl.classList.remove("visible");
      errorEl.textContent = "";
    }

    function renderGrid(dim, count, values) {
      grid.className = "calc-grid cols-" + dim;
      grid.setAttribute("data-dim", String(dim));
      grid.setAttribute("data-count", String(count));
      grid.innerHTML = "";
      for (var i = 0; i < count; i++) {
        for (var j = 0; j < dim; j++) {
          var id = "gs-" + i + "-" + j;
          var label = document.createElement("label");
          label.setAttribute("for", id);
          label.appendChild(document.createTextNode("v" + SUB[i] + SUB[j] + " "));
          var input = document.createElement("input");
          input.id = id;
          input.type = "text";
          input.setAttribute("inputmode", "text");
          input.setAttribute("autocomplete", "off");
          input.setAttribute("spellcheck", "false");
          input.setAttribute("aria-label", "Vector " + (i + 1) + ", entry " + (j + 1));
          var idx = i * dim + j;
          input.value = values && values[idx] != null ? values[idx] : "0";
          label.appendChild(input);
          grid.appendChild(label);
        }
      }
    }

    function readVectors() {
      var dim = parseInt(dimEl.value, 10);
      var count = parseInt(countEl.value, 10);
      var vectors = [];
      for (var i = 0; i < count; i++) {
        var row = [];
        for (var j = 0; j < dim; j++) {
          var el = document.getElementById("gs-" + i + "-" + j);
          row.push(parseEntry(el ? el.value : "", "vector " + (i + 1) + ", entry " + (j + 1)));
        }
        vectors.push(row);
      }
      return vectors;
    }

    function run() {
      clearError();
      try {
        var solved = process(readVectors(), { units: unitsEl.checked });
        amountOut.textContent = solved.summary;
        detailOut.textContent = solved.lines.join("\n") + "\n\nEducational use only.";
        resultEl.classList.add("visible");
      } catch (err) {
        showError(err.message || "Could not complete the calculation.");
      }
    }

    function currentValues() {
      var values = [];
      grid.querySelectorAll("input").forEach(function (input) { values.push(input.value); });
      return values;
    }

    function resize(keep) {
      var dim = parseInt(dimEl.value, 10);
      var count = parseInt(countEl.value, 10);
      var oldDim = parseInt(grid.getAttribute("data-dim") || String(dim), 10);
      var oldCount = parseInt(grid.getAttribute("data-count") || String(count), 10);
      var previous = keep ? currentValues() : null;
      var carried = [];
      for (var i = 0; i < count; i++) {
        for (var j = 0; j < dim; j++) {
          if (previous && i < oldCount && j < oldDim) carried.push(previous[i * oldDim + j]);
          else carried.push("0");
        }
      }
      renderGrid(dim, count, previous ? carried : null);
    }

    dimEl.addEventListener("change", function () { resize(true); run(); });
    countEl.addEventListener("change", function () { resize(true); run(); });
    unitsEl.addEventListener("change", run);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      run();
    });

    function load(dim, count, values, units) {
      dimEl.value = String(dim);
      countEl.value = String(count);
      unitsEl.checked = units !== false;
      renderGrid(dim, count, values);
      run();
    }

    document.getElementById("gs-preset-book").addEventListener("click", function () {
      load(3, 3, ["1", "1", "0", "1", "0", "1", "0", "1", "1"], true);
    });
    document.getElementById("gs-preset-plane").addEventListener("click", function () {
      load(2, 2, ["3", "4", MINUS + "4", "3"], true);
    });
    document.getElementById("gs-preset-dependent").addEventListener("click", function () {
      load(2, 3, ["1", "0", "2", "0", "1", "1"], true);
    });
    document.getElementById("gs-reset").addEventListener("click", function () {
      load(DEFAULTS.dim, DEFAULTS.count, DEFAULTS.values, DEFAULTS.units);
    });

    renderGrid(DEFAULTS.dim, DEFAULTS.count, DEFAULTS.values);
    run();
  }

  return {
    parseEntry: parseEntry,
    process: process,
    fmt: fmt,
    fmtVec: fmtVec,
    fmtUnit: fmtUnit,
    dot: dot,
    eq: eq,
    isZero: isZero,
    ZERO: ZERO,
    ONE: ONE,
    MINUS: MINUS,
    DEFAULTS: DEFAULTS,
    boot: boot
  };
});
