(function () {
  "use strict";

  /* Mobile nav */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.querySelector(".site-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  /* Contact form → mailto with required subject */
  var form = document.getElementById("contact-form");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = (document.getElementById("name") || {}).value || "";
      var email = (document.getElementById("email") || {}).value || "";
      var message = (document.getElementById("message") || {}).value || "";
      var body =
        "Name: " + name.trim() +
        "\nEmail: " + email.trim() +
        "\n\n" + message.trim();
      var mailto =
        "mailto:joshuaofisrael@gmail.com" +
        "?subject=" + encodeURIComponent("[Contact: Higher Math Guide]") +
        "&body=" + encodeURIComponent(body);
      window.location.href = mailto;
    });
  }

  /* Shared helpers for calculators */
  function formatNum(n) {
    if (typeof n !== "number" || !isFinite(n)) return String(n);
    var a = Math.abs(n);
    if (a !== 0 && (a < 1e-4 || a >= 1e6)) return n.toExponential(6);
    return (Math.round(n * 1e10) / 1e10).toString();
  }

  function parseNum(el, label) {
    var v = parseFloat(el && el.value);
    if (!isFinite(v)) throw new Error("Enter a valid number for " + label + ".");
    return v;
  }

  function parseIntStrict(el, label, min, max) {
    var raw = (el && el.value || "").trim();
    if (!/^-?\d+$/.test(raw)) throw new Error(label + " must be an integer.");
    var v = parseInt(raw, 10);
    if (min !== undefined && v < min) throw new Error(label + " must be at least " + min + ".");
    if (max !== undefined && v > max) throw new Error(label + " must be at most " + max + ".");
    return v;
  }

  function wireCalc(ids, onCompute, onReset) {
    var btn = document.getElementById(ids.compute);
    if (!btn) return null;
    var resultEl = document.getElementById(ids.result);
    var amountOut = document.getElementById(ids.amount);
    var detailOut = document.getElementById(ids.detail);
    var errorEl = document.getElementById(ids.error);
    var resetBtn = ids.reset ? document.getElementById(ids.reset) : null;

    function showError(msg) {
      errorEl.textContent = msg;
      errorEl.classList.add("visible");
      resultEl.classList.remove("visible");
    }
    function clearError() {
      errorEl.classList.remove("visible");
      errorEl.textContent = "";
    }
    function showResult(amount, detail) {
      amountOut.textContent = amount;
      detailOut.textContent = detail;
      resultEl.classList.add("visible");
    }

    btn.addEventListener("click", function () {
      clearError();
      try {
        onCompute({ showError: showError, showResult: showResult, clearError: clearError });
      } catch (err) {
        showError(err.message || "Could not complete the calculation.");
      }
    });

    if (resetBtn && onReset) {
      resetBtn.addEventListener("click", function () {
        onReset();
        clearError();
        resultEl.classList.remove("visible");
      });
    }

    return { showError: showError, showResult: showResult, clearError: clearError };
  }

  /* Safe-ish evaluator for simple math expressions in x */
  function buildFn(expr) {
    var cleaned = String(expr).trim().toLowerCase()
      .replace(/\^/g, "**")
      .replace(/\bpi\b/g, "Math.PI")
      .replace(/\be\b/g, "Math.E");
    var test = cleaned
      .replace(/Math\.(PI|E|sin|cos|tan|sqrt|abs|log|exp)/g, "")
      .replace(/\*\*/g, "");
    if (!/^[0-9x+\-*/().,\s]*$/i.test(test)) {
      throw new Error("Unsupported characters in expression. Use x, +, -, *, /, ^, (), and sin/cos/tan/sqrt/abs/log/exp/pi/e.");
    }
    var mapped = cleaned
      .replace(/\bsin\(/g, "Math.sin(")
      .replace(/\bcos\(/g, "Math.cos(")
      .replace(/\btan\(/g, "Math.tan(")
      .replace(/\bsqrt\(/g, "Math.sqrt(")
      .replace(/\babs\(/g, "Math.abs(")
      .replace(/\blog\(/g, "Math.log(")
      .replace(/\bexp\(/g, "Math.exp(");
    /* eslint-disable no-new-func */
    return new Function("x", "return (" + mapped + ");");
  }

  function factorialSafe(n) {
    if (n < 0) throw new Error("Factorial is not defined for negative integers here.");
    if (n > 170) throw new Error("n! overflows IEEE double above 170. Try a smaller n.");
    var r = 1;
    for (var i = 2; i <= n; i++) r *= i;
    return r;
  }

  function logFactorial(n) {
    if (n < 0) throw new Error("Factorial is not defined for negative integers here.");
    var s = 0;
    for (var i = 2; i <= n; i++) s += Math.log(i);
    return s;
  }

  function combSafe(n, k) {
    if (k < 0 || k > n) return 0;
    k = Math.min(k, n - k);
    var r = 1;
    for (var i = 1; i <= k; i++) {
      r = (r * (n - k + i)) / i;
    }
    return Math.round(r);
  }

  function permSafe(n, k) {
    if (k < 0 || k > n) return 0;
    var r = 1;
    for (var i = 0; i < k; i++) r *= (n - i);
    return r;
  }

  /* Normal CDF via Abramowitz & Stegun 7.1.26 rational approximation to erf */
  function erfApprox(x) {
    var sign = x < 0 ? -1 : 1;
    x = Math.abs(x);
    var a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
    var a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
    var t = 1 / (1 + p * x);
    var y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    return sign * y;
  }

  function normalCdf(z) {
    return 0.5 * (1 + erfApprox(z / Math.SQRT2));
  }

  /* Inverse normal CDF via Beasley-Springer/Moro-style rational approximation */
  function invNormalCdf(p) {
    if (!(p > 0 && p < 1)) throw new Error("Percentile / probability must be strictly between 0 and 1.");
    if (p === 0.5) return 0;
    var a = [
      -3.969683028665376e+01,
      2.209460984245205e+02,
      -2.759285104469687e+02,
      1.383577459334152e+02,
      -3.066479806614716e+01,
      2.506628277459239e+00
    ];
    var b = [
      -5.447609879822406e+01,
      1.615858368580409e+02,
      -1.556989798598866e+02,
      6.680131188771972e+01,
      -1.328068155288572e+01
    ];
    var c = [
      -7.784894002430293e-03,
      -3.223964580411365e-01,
      -2.400758277161838e+00,
      -2.549732539343734e+00,
      4.374664141464968e+00,
      2.938163982698783e+00
    ];
    var d = [
      7.784695709041462e-03,
      3.224671290700398e-01,
      2.445134137142996e+00,
      3.754408661907416e+00
    ];
    var plow = 0.02425;
    var phigh = 1 - plow;
    var q, r;
    if (p < plow) {
      q = Math.sqrt(-2 * Math.log(p));
      return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
        ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    }
    if (p > phigh) {
      q = Math.sqrt(-2 * Math.log(1 - p));
      return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
        ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    }
    q = p - 0.5;
    r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }

  /* ---------- Numerical derivative ---------- */
  (function () {
    var calcBtn = document.getElementById("calc-slope");
    if (!calcBtn) return;
    var fxEl = document.getElementById("fx-expr");
    var x0El = document.getElementById("x0");
    var hEl = document.getElementById("h-step");
    var methodEl = document.getElementById("diff-method");
    var resultEl = document.getElementById("calc-result");
    var amountOut = document.getElementById("result-amount");
    var detailOut = document.getElementById("result-detail");
    var errorEl = document.getElementById("calc-error");
    var resetBtn = document.getElementById("calc-reset");

    function showError(msg) {
      errorEl.textContent = msg;
      errorEl.classList.add("visible");
      resultEl.classList.remove("visible");
    }
    function clearError() {
      errorEl.classList.remove("visible");
      errorEl.textContent = "";
    }

    calcBtn.addEventListener("click", function () {
      clearError();
      var expr = (fxEl.value || "").trim();
      var x0 = parseFloat(x0El.value);
      var h = parseFloat(hEl.value);
      var method = (methodEl && methodEl.value) || "central";

      if (!expr) {
        showError("Enter a function of x (for example: x^2 or sin(x)).");
        return;
      }
      if (!isFinite(x0)) {
        showError("Enter a valid number for x₀.");
        return;
      }
      if (!isFinite(h) || h === 0) {
        showError("Step size h must be a non-zero number (try 0.001).");
        return;
      }
      if (Math.abs(h) > 1) {
        showError("Choose a smaller step size |h| (at most 1) for a meaningful estimate.");
        return;
      }

      var f;
      try {
        f = buildFn(expr);
      } catch (err) {
        showError(err.message || "Could not parse the expression.");
        return;
      }

      var estimate;
      var detail;
      try {
        if (method === "forward") {
          var f0 = f(x0);
          var f1 = f(x0 + h);
          if (!isFinite(f0) || !isFinite(f1)) throw new Error("Function returned a non-finite value.");
          estimate = (f1 - f0) / h;
          detail = "Forward difference: [f(x₀+h) − f(x₀)] / h with h = " + formatNum(h) +
            ". f(x₀) = " + formatNum(f0) + ", f(x₀+h) = " + formatNum(f1) + ".";
        } else if (method === "backward") {
          var fb0 = f(x0);
          var fb1 = f(x0 - h);
          if (!isFinite(fb0) || !isFinite(fb1)) throw new Error("Function returned a non-finite value.");
          estimate = (fb0 - fb1) / h;
          detail = "Backward difference: [f(x₀) − f(x₀−h)] / h with h = " + formatNum(h) +
            ". f(x₀) = " + formatNum(fb0) + ", f(x₀−h) = " + formatNum(fb1) + ".";
        } else {
          var fc1 = f(x0 + h);
          var fc2 = f(x0 - h);
          if (!isFinite(fc1) || !isFinite(fc2)) throw new Error("Function returned a non-finite value.");
          estimate = (fc1 - fc2) / (2 * h);
          detail = "Central difference: [f(x₀+h) − f(x₀−h)] / (2h) with h = " + formatNum(h) +
            ". f(x₀+h) = " + formatNum(fc1) + ", f(x₀−h) = " + formatNum(fc2) + ".";
        }
        if (!isFinite(estimate)) throw new Error("Estimate was not a finite number.");
      } catch (err2) {
        showError(err2.message || "Could not evaluate the derivative estimate.");
        return;
      }

      amountOut.textContent = formatNum(estimate);
      detailOut.textContent = detail +
        " This is a numerical estimate of f′(x₀), not a symbolic derivative. Educational use only.";
      resultEl.classList.add("visible");
    });

    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        fxEl.value = "x^2";
        x0El.value = "3";
        hEl.value = "0.001";
        if (methodEl) methodEl.value = "central";
        clearError();
        resultEl.classList.remove("visible");
      });
    }
  })();

  /* ---------- Quadratic formula ---------- */
  wireCalc(
    { compute: "qf-compute", reset: "qf-reset", result: "qf-result", amount: "qf-amount", detail: "qf-detail", error: "qf-error" },
    function (api) {
      var a = parseNum(document.getElementById("qf-a"), "a");
      var b = parseNum(document.getElementById("qf-b"), "b");
      var c = parseNum(document.getElementById("qf-c"), "c");
      if (a === 0) throw new Error("a must be nonzero for a quadratic equation.");
      var D = b * b - 4 * a * c;
      var twoA = 2 * a;
      var amount, detail;
      if (D > 0) {
        var s = Math.sqrt(D);
        var r1 = (-b + s) / twoA;
        var r2 = (-b - s) / twoA;
        amount = "x = " + formatNum(r1) + ",  " + formatNum(r2);
        detail = "Discriminant Δ = b² − 4ac = " + formatNum(D) + " > 0 → two distinct real roots.";
      } else if (D === 0) {
        var r = -b / twoA;
        amount = "x = " + formatNum(r) + " (double root)";
        detail = "Discriminant Δ = 0 → one repeated real root.";
      } else {
        var re = -b / twoA;
        var im = Math.sqrt(-D) / Math.abs(twoA);
        var signIm = twoA < 0 ? -1 : 1;
        im *= signIm;
        /* Present as re ± |im| i with consistent sign */
        im = Math.sqrt(-D) / Math.abs(twoA);
        amount = "x = " + formatNum(re) + " ± " + formatNum(im) + " i";
        detail = "Discriminant Δ = " + formatNum(D) + " < 0 → complex conjugate roots. Written as (−b ± √|Δ| i) / (2a).";
      }
      api.showResult(amount, detail + " Educational use only.");
    },
    function () {
      document.getElementById("qf-a").value = "1";
      document.getElementById("qf-b").value = "-3";
      document.getElementById("qf-c").value = "2";
    }
  );

  /* ---------- 2×2 matrices ---------- */
  wireCalc(
    { compute: "m22-compute", reset: "m22-reset", result: "m22-result", amount: "m22-amount", detail: "m22-detail", error: "m22-error" },
    function (api) {
      function readMat(prefix) {
        return [
          [parseNum(document.getElementById(prefix + "00"), prefix + "[0][0]"), parseNum(document.getElementById(prefix + "01"), prefix + "[0][1]")],
          [parseNum(document.getElementById(prefix + "10"), prefix + "[1][0]"), parseNum(document.getElementById(prefix + "11"), prefix + "[1][1]")]
        ];
      }
      var A = readMat("a");
      var B = readMat("b");
      var mode = (document.getElementById("m22-mode") || {}).value || "detA";
      var detA = A[0][0] * A[1][1] - A[0][1] * A[1][0];
      var detB = B[0][0] * B[1][1] - B[0][1] * B[1][0];
      var amount, detail;
      if (mode === "detA") {
        amount = "det(A) = " + formatNum(detA);
        detail = "det(A) = a₁₁a₂₂ − a₁₂a₂₁.";
      } else if (mode === "detB") {
        amount = "det(B) = " + formatNum(detB);
        detail = "det(B) = b₁₁b₂₂ − b₁₂b₂₁.";
      } else if (mode === "invA") {
        if (Math.abs(detA) < 1e-14) throw new Error("A is singular (det ≈ 0); inverse does not exist.");
        var inv = [
          [A[1][1] / detA, -A[0][1] / detA],
          [-A[1][0] / detA, A[0][0] / detA]
        ];
        amount = "A⁻¹ ≈ [[" + formatNum(inv[0][0]) + ", " + formatNum(inv[0][1]) + "], [" +
          formatNum(inv[1][0]) + ", " + formatNum(inv[1][1]) + "]]";
        detail = "Using (1/det(A)) · [[d, −b], [−c, a]] with det(A) = " + formatNum(detA) + ".";
      } else if (mode === "invB") {
        if (Math.abs(detB) < 1e-14) throw new Error("B is singular (det ≈ 0); inverse does not exist.");
        var invB = [
          [B[1][1] / detB, -B[0][1] / detB],
          [-B[1][0] / detB, B[0][0] / detB]
        ];
        amount = "B⁻¹ ≈ [[" + formatNum(invB[0][0]) + ", " + formatNum(invB[0][1]) + "], [" +
          formatNum(invB[1][0]) + ", " + formatNum(invB[1][1]) + "]]";
        detail = "Using (1/det(B)) adjugate with det(B) = " + formatNum(detB) + ".";
      } else if (mode === "AB") {
        var C = [
          [A[0][0] * B[0][0] + A[0][1] * B[1][0], A[0][0] * B[0][1] + A[0][1] * B[1][1]],
          [A[1][0] * B[0][0] + A[1][1] * B[1][0], A[1][0] * B[0][1] + A[1][1] * B[1][1]]
        ];
        amount = "AB = [[" + formatNum(C[0][0]) + ", " + formatNum(C[0][1]) + "], [" +
          formatNum(C[1][0]) + ", " + formatNum(C[1][1]) + "]]";
        detail = "Row-by-column products. Note AB is not always equal to BA.";
      } else {
        var D = [
          [B[0][0] * A[0][0] + B[0][1] * A[1][0], B[0][0] * A[0][1] + B[0][1] * A[1][1]],
          [B[1][0] * A[0][0] + B[1][1] * A[1][0], B[1][0] * A[0][1] + B[1][1] * A[1][1]]
        ];
        amount = "BA = [[" + formatNum(D[0][0]) + ", " + formatNum(D[0][1]) + "], [" +
          formatNum(D[1][0]) + ", " + formatNum(D[1][1]) + "]]";
        detail = "Row-by-column products for BA.";
      }
      api.showResult(amount, detail + " Educational use only.");
    },
    function () {
      var defaults = { a00: 1, a01: 2, a10: 3, a11: 4, b00: 0, b01: 1, b10: 1, b11: 0 };
      Object.keys(defaults).forEach(function (k) {
        document.getElementById(k).value = String(defaults[k]);
      });
      document.getElementById("m22-mode").value = "detA";
    }
  );

  /* ---------- Vector operations ---------- */
  wireCalc(
    { compute: "vec-compute", reset: "vec-reset", result: "vec-result", amount: "vec-amount", detail: "vec-detail", error: "vec-error" },
    function (api) {
      var dim = (document.getElementById("vec-dim") || {}).value || "3";
      var u = [
        parseNum(document.getElementById("u0"), "u₁"),
        parseNum(document.getElementById("u1"), "u₂"),
        dim === "3" ? parseNum(document.getElementById("u2"), "u₃") : 0
      ];
      var v = [
        parseNum(document.getElementById("v0"), "v₁"),
        parseNum(document.getElementById("v1"), "v₂"),
        dim === "3" ? parseNum(document.getElementById("v2"), "v₃") : 0
      ];
      var op = (document.getElementById("vec-op") || {}).value || "dot";
      var amount, detail;
      if (op === "dot") {
        var dot = u[0] * v[0] + u[1] * v[1] + (dim === "3" ? u[2] * v[2] : 0);
        amount = "u · v = " + formatNum(dot);
        detail = "Dot product is Σ uᵢ vᵢ. Related to |u||v| cos θ.";
      } else if (op === "cross") {
        if (dim !== "3") throw new Error("Cross product is defined here for 3D vectors only. Switch dimension to 3D.");
        var cx = u[1] * v[2] - u[2] * v[1];
        var cy = u[2] * v[0] - u[0] * v[2];
        var cz = u[0] * v[1] - u[1] * v[0];
        amount = "u × v = ⟨" + formatNum(cx) + ", " + formatNum(cy) + ", " + formatNum(cz) + "⟩";
        detail = "Cross product is orthogonal to both u and v (right-hand rule).";
      } else if (op === "magU" || op === "magV") {
        var w = op === "magU" ? u : v;
        var name = op === "magU" ? "u" : "v";
        var mag = Math.sqrt(w[0] * w[0] + w[1] * w[1] + (dim === "3" ? w[2] * w[2] : 0));
        amount = "|" + name + "| = " + formatNum(mag);
        detail = "Euclidean magnitude √(Σ components²).";
      } else {
        var t = op === "unitU" ? u : v;
        var tname = op === "unitU" ? "u" : "v";
        var m = Math.sqrt(t[0] * t[0] + t[1] * t[1] + (dim === "3" ? t[2] * t[2] : 0));
        if (m < 1e-15) throw new Error("Cannot form a unit vector from the zero vector.");
        if (dim === "3") {
          amount = "û = ⟨" + formatNum(t[0] / m) + ", " + formatNum(t[1] / m) + ", " + formatNum(t[2] / m) + "⟩";
        } else {
          amount = "û = ⟨" + formatNum(t[0] / m) + ", " + formatNum(t[1] / m) + "⟩";
        }
        detail = "Unit vector for " + tname + " is " + tname + " / |" + tname + "| with |" + tname + "| = " + formatNum(m) + ".";
      }
      api.showResult(amount, detail + " Educational use only.");
    },
    function () {
      document.getElementById("vec-dim").value = "3";
      document.getElementById("u0").value = "1";
      document.getElementById("u1").value = "0";
      document.getElementById("u2").value = "0";
      document.getElementById("v0").value = "0";
      document.getElementById("v1").value = "1";
      document.getElementById("v2").value = "0";
      document.getElementById("vec-op").value = "dot";
      var z = document.getElementById("u2").closest("label") || document.getElementById("u2");
      document.querySelectorAll(".vec-z").forEach(function (el) { el.style.display = ""; });
    }
  );

  var vecDim = document.getElementById("vec-dim");
  if (vecDim) {
    vecDim.addEventListener("change", function () {
      var show = vecDim.value === "3";
      document.querySelectorAll(".vec-z").forEach(function (el) {
        el.style.display = show ? "" : "none";
      });
    });
  }

  /* ---------- Binomial probability ---------- */
  wireCalc(
    { compute: "bin-compute", reset: "bin-reset", result: "bin-result", amount: "bin-amount", detail: "bin-detail", error: "bin-error" },
    function (api) {
      var n = parseIntStrict(document.getElementById("bin-n"), "n", 0, 1000);
      var k = parseIntStrict(document.getElementById("bin-k"), "k", 0, n);
      var p = parseNum(document.getElementById("bin-p"), "p");
      if (p < 0 || p > 1) throw new Error("Success probability p must lie in [0, 1].");
      var choose = combSafe(n, k);
      /* Use logs for stability when n is large */
      var logP;
      if (p === 0) logP = (k === 0 ? 0 : -Infinity);
      else if (p === 1) logP = (k === n ? 0 : -Infinity);
      else logP = logFactorial(n) - logFactorial(k) - logFactorial(n - k) + k * Math.log(p) + (n - k) * Math.log(1 - p);
      var pk = Math.exp(logP);
      if (!isFinite(pk)) pk = 0;
      api.showResult(
        "C(" + n + "," + k + ") = " + formatNum(choose) + ";  P(X=" + k + ") ≈ " + formatNum(pk),
        "Binomial model: X ~ Binomial(n, p) with P(X=k) = C(n,k) p^k (1−p)^{n−k}. Computed with log-space arithmetic for stability. Educational use only."
      );
    },
    function () {
      document.getElementById("bin-n").value = "10";
      document.getElementById("bin-k").value = "3";
      document.getElementById("bin-p").value = "0.5";
    }
  );

  /* ---------- Normal CDF ---------- */
  wireCalc(
    { compute: "ncdf-compute", reset: "ncdf-reset", result: "ncdf-result", amount: "ncdf-amount", detail: "ncdf-detail", error: "ncdf-error" },
    function (api) {
      var mode = (document.getElementById("ncdf-mode") || {}).value || "cdf";
      if (mode === "cdf") {
        var z = parseNum(document.getElementById("ncdf-z"), "z");
        var phi = normalCdf(z);
        api.showResult(
          "Φ(" + formatNum(z) + ") ≈ " + formatNum(phi),
          "Standard normal CDF via erf approximation (Abramowitz & Stegun 7.1.26). Absolute error is typically under about 1.5×10⁻⁷. Educational use only."
        );
      } else {
        var pct = parseNum(document.getElementById("ncdf-pct"), "percentile");
        var p = pct > 1 ? pct / 100 : pct;
        if (!(p > 0 && p < 1)) throw new Error("Enter a percentile in (0,100) or a probability in (0,1).");
        var zz = invNormalCdf(p);
        api.showResult(
          "z ≈ " + formatNum(zz) + "  (for p = " + formatNum(p) + ")",
          "Inverse CDF uses a rational approximation (Acklam / Beasley–Springer style). Educational use only."
        );
      }
    },
    function () {
      document.getElementById("ncdf-mode").value = "cdf";
      document.getElementById("ncdf-z").value = "1.96";
      document.getElementById("ncdf-pct").value = "97.5";
    }
  );

  /* ---------- Sequences & series ---------- */
  wireCalc(
    { compute: "seq-compute", reset: "seq-reset", result: "seq-result", amount: "seq-amount", detail: "seq-detail", error: "seq-error" },
    function (api) {
      var kind = (document.getElementById("seq-kind") || {}).value || "arith";
      var n = parseIntStrict(document.getElementById("seq-n"), "n", 1, 1e7);
      var amount, detail;
      if (kind === "arith") {
        var a1 = parseNum(document.getElementById("seq-a1"), "a₁");
        var d = parseNum(document.getElementById("seq-d"), "common difference d");
        var an = a1 + (n - 1) * d;
        var sn = (n / 2) * (2 * a1 + (n - 1) * d);
        amount = "aₙ = " + formatNum(an) + ";  Sₙ = " + formatNum(sn);
        detail = "Arithmetic: aₙ = a₁ + (n−1)d, Sₙ = n/2 · (2a₁ + (n−1)d).";
      } else {
        var g1 = parseNum(document.getElementById("seq-a1"), "a₁");
        var r = parseNum(document.getElementById("seq-r"), "common ratio r");
        var gn = g1 * Math.pow(r, n - 1);
        var gs;
        if (r === 1) gs = n * g1;
        else gs = g1 * (1 - Math.pow(r, n)) / (1 - r);
        if (!isFinite(gn) || !isFinite(gs)) throw new Error("Result overflowed. Try smaller |r| or n.");
        amount = "aₙ = " + formatNum(gn) + ";  Sₙ = " + formatNum(gs);
        detail = "Geometric: aₙ = a₁ r^{n−1}, Sₙ = a₁(1−rⁿ)/(1−r) when r≠1.";
      }
      api.showResult(amount, detail + " Finite sums only. Educational use only.");
    },
    function () {
      document.getElementById("seq-kind").value = "arith";
      document.getElementById("seq-a1").value = "2";
      document.getElementById("seq-d").value = "3";
      document.getElementById("seq-r").value = "0.5";
      document.getElementById("seq-n").value = "10";
    }
  );

  var seqKind = document.getElementById("seq-kind");
  if (seqKind) {
    function syncSeqFields() {
      var arith = seqKind.value === "arith";
      document.getElementById("seq-d-wrap").style.display = arith ? "" : "none";
      document.getElementById("seq-r-wrap").style.display = arith ? "none" : "";
    }
    seqKind.addEventListener("change", syncSeqFields);
    syncSeqFields();
  }

  /* ---------- Combinatorics ---------- */
  wireCalc(
    { compute: "comb-compute", reset: "comb-reset", result: "comb-result", amount: "comb-amount", detail: "comb-detail", error: "comb-error" },
    function (api) {
      var mode = (document.getElementById("comb-mode") || {}).value || "nCr";
      var n = parseIntStrict(document.getElementById("comb-n"), "n", 0, 100000);
      var amount, detail;
      if (mode === "fact") {
        var f = factorialSafe(n);
        amount = n + "! = " + formatNum(f);
        detail = "Computed by successive multiplication. Doubles overflow past 170!.";
      } else {
        var k = parseIntStrict(document.getElementById("comb-k"), "k", 0, n);
        if (mode === "nCr") {
          if (n > 1000) {
            var logC = logFactorial(n) - logFactorial(k) - logFactorial(n - k);
            if (logC > Math.log(Number.MAX_VALUE)) throw new Error("C(n,k) overflows double range. Try smaller n.");
            amount = "C(" + n + "," + k + ") ≈ " + formatNum(Math.round(Math.exp(logC)));
          } else {
            amount = "C(" + n + "," + k + ") = " + formatNum(combSafe(n, k));
          }
          detail = "nCr = n! / (k!(n−k)!) counts unordered selections.";
        } else {
          if (n > 170 && k > 20) {
            var logP = logFactorial(n) - logFactorial(n - k);
            if (logP > Math.log(Number.MAX_VALUE)) throw new Error("P(n,k) overflows double range. Try smaller n or k.");
            amount = "P(" + n + "," + k + ") ≈ " + formatNum(Math.round(Math.exp(logP)));
          } else {
            var pv = permSafe(n, k);
            if (!isFinite(pv)) throw new Error("P(n,k) overflowed. Try smaller values.");
            amount = "P(" + n + "," + k + ") = " + formatNum(pv);
          }
          detail = "nPr = n! / (n−k)! counts ordered selections.";
        }
      }
      api.showResult(amount, detail + " Educational use only.");
    },
    function () {
      document.getElementById("comb-mode").value = "nCr";
      document.getElementById("comb-n").value = "10";
      document.getElementById("comb-k").value = "3";
    }
  );

  /* ---------- Limit estimator ---------- */
  wireCalc(
    { compute: "lim-compute", reset: "lim-reset", result: "lim-result", amount: "lim-amount", detail: "lim-detail", error: "lim-error" },
    function (api) {
      var expr = (document.getElementById("lim-expr").value || "").trim();
      if (!expr) throw new Error("Enter an expression in x.");
      var approach = (document.getElementById("lim-approach") || {}).value || "finite";
      var f = buildFn(expr);
      var samples = [];
      var i, x, y;
      if (approach === "finite") {
        var a = parseNum(document.getElementById("lim-a"), "a");
        var deltas = [1e-1, 1e-2, 1e-3, 1e-4, 1e-5, 1e-6];
        for (i = 0; i < deltas.length; i++) {
          x = a + deltas[i];
          y = f(x);
          samples.push({ side: "right", x: x, y: y });
          x = a - deltas[i];
          y = f(x);
          samples.push({ side: "left", x: x, y: y });
        }
        var lefts = samples.filter(function (s) { return s.side === "left" && isFinite(s.y); }).map(function (s) { return s.y; });
        var rights = samples.filter(function (s) { return s.side === "right" && isFinite(s.y); }).map(function (s) { return s.y; });
        if (!lefts.length || !rights.length) throw new Error("Could not obtain finite sample values near a. Check domain.");
        var L = lefts[lefts.length - 1];
        var R = rights[rights.length - 1];
        var mid = 0.5 * (L + R);
        var gap = Math.abs(R - L);
        api.showResult(
          "Estimated limit ≈ " + formatNum(mid),
          "Sampled from both sides approaching a = " + formatNum(a) +
            ". Nearest left ≈ " + formatNum(L) + ", nearest right ≈ " + formatNum(R) +
            ", |gap| ≈ " + formatNum(gap) +
            ". This is a numerical probe, not a proof. Large gaps suggest a jump or singularity. Educational use only."
        );
      } else {
        var dir = approach === "posinf" ? 1 : -1;
        var xs = [10, 100, 1000, 10000, 1e5, 1e6];
        var vals = [];
        for (i = 0; i < xs.length; i++) {
          x = dir * xs[i];
          y = f(x);
          if (isFinite(y)) vals.push({ x: x, y: y });
        }
        if (vals.length < 2) throw new Error("Not enough finite samples as |x|→∞.");
        var last = vals[vals.length - 1].y;
        var prev = vals[vals.length - 2].y;
        api.showResult(
          "Estimated limit ≈ " + formatNum(last),
          "Sampled at x = " + vals.map(function (v) { return formatNum(v.x); }).join(", ") +
            ". Last two values: " + formatNum(prev) + ", " + formatNum(last) +
            ". Oscillation or blow-up may mean the limit does not exist (finitely). Educational use only."
        );
      }
    },
    function () {
      document.getElementById("lim-expr").value = "(x^2-1)/(x-1)";
      document.getElementById("lim-approach").value = "finite";
      document.getElementById("lim-a").value = "1";
    }
  );

  /* ---------- Riemann sum ---------- */
  wireCalc(
    { compute: "rie-compute", reset: "rie-reset", result: "rie-result", amount: "rie-amount", detail: "rie-detail", error: "rie-error" },
    function (api) {
      var expr = (document.getElementById("rie-expr").value || "").trim();
      if (!expr) throw new Error("Enter an expression in x.");
      var a = parseNum(document.getElementById("rie-a"), "a");
      var b = parseNum(document.getElementById("rie-b"), "b");
      if (b === a) throw new Error("Require b ≠ a.");
      var n = parseIntStrict(document.getElementById("rie-n"), "n", 1, 200000);
      var method = (document.getElementById("rie-method") || {}).value || "mid";
      var f = buildFn(expr);
      var dx = (b - a) / n;
      var sum = 0;
      var i, xi;
      for (i = 0; i < n; i++) {
        if (method === "left") xi = a + i * dx;
        else if (method === "right") xi = a + (i + 1) * dx;
        else xi = a + (i + 0.5) * dx;
        var yi = f(xi);
        if (!isFinite(yi)) throw new Error("Non-finite value at x = " + formatNum(xi) + ".");
        sum += yi;
      }
      var approx = sum * dx;
      if (!isFinite(approx)) throw new Error("Sum overflowed.");
      api.showResult(
        "≈ " + formatNum(approx),
        method.charAt(0).toUpperCase() + method.slice(1) +
          " Riemann sum with n = " + n + " subintervals on [" + formatNum(a) + ", " + formatNum(b) +
          "], Δx = " + formatNum(dx) +
          ". This approximates ∫_a^b f(x) dx; it is not an exact antiderivative. Educational use only."
      );
    },
    function () {
      document.getElementById("rie-expr").value = "x^2";
      document.getElementById("rie-a").value = "0";
      document.getElementById("rie-b").value = "1";
      document.getElementById("rie-n").value = "100";
      document.getElementById("rie-method").value = "mid";
    }
  );

  /* ---------- Eigenvalues 2×2 ---------- */
  wireCalc(
    { compute: "eig-compute", reset: "eig-reset", result: "eig-result", amount: "eig-amount", detail: "eig-detail", error: "eig-error" },
    function (api) {
      var a = parseNum(document.getElementById("eig-a"), "a");
      var b = parseNum(document.getElementById("eig-b"), "b");
      var c = parseNum(document.getElementById("eig-c"), "c");
      var d = parseNum(document.getElementById("eig-d"), "d");
      var tr = a + d;
      var det = a * d - b * c;
      var disc = tr * tr - 4 * det;
      var amount, detail;
      detail = "Characteristic polynomial: λ² − (tr)λ + det = 0 with tr = " + formatNum(tr) +
        ", det = " + formatNum(det) + ", discriminant = " + formatNum(disc) + ". ";
      if (disc >= 0) {
        var s = Math.sqrt(disc);
        var l1 = (tr + s) / 2;
        var l2 = (tr - s) / 2;
        amount = "λ = " + formatNum(l1) + ",  " + formatNum(l2);
        detail += disc === 0 ? "Repeated real eigenvalue." : "Two real eigenvalues.";
      } else {
        var re = tr / 2;
        var im = Math.sqrt(-disc) / 2;
        amount = "λ = " + formatNum(re) + " ± " + formatNum(im) + " i";
        detail += "Complex conjugate eigenvalues.";
      }
      api.showResult(amount, detail + " Educational use only.");
    },
    function () {
      document.getElementById("eig-a").value = "2";
      document.getElementById("eig-b").value = "1";
      document.getElementById("eig-c").value = "1";
      document.getElementById("eig-d").value = "2";
    }
  );
})();
