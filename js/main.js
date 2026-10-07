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
      var reason = (document.getElementById("reason") || {}).value || "";
      var topic = (document.getElementById("topic-idea") || {}).value || "";
      var message = (document.getElementById("message") || {}).value || "";
      var body =
        "Name: " + name.trim() +
        "\nEmail: " + email.trim() +
        (reason ? "\nReason: " + reason.trim() : "") +
        (topic.trim() ? "\nTopic idea: " + topic.trim() : "") +
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
      .replace(/\b(sin|cos|tan|sqrt|abs|log|exp)\b/g, "")
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

  /* ---------- Bayes theorem ---------- */
  function bayesUnit(value, label) {
    if (value < 0 || value > 1) {
      if (value > 1 && value <= 100) {
        throw new Error(label + " must lie in [0, 1]. If you meant a percent, divide by 100.");
      }
      throw new Error(label + " must lie in [0, 1].");
    }
    return value;
  }

  function bayesHeadline(n) {
    if (!isFinite(n)) return String(n);
    var abs = Math.abs(n);
    if (n !== 0 && (abs < 1e-4 || abs >= 1e6)) return formatNum(n);
    return String(Math.round(n * 1e6) / 1e6);
  }

  function bayesPct(n) {
    var p = Math.round(n * 1000000) / 10000;
    return String(p) + "%";
  }

  var bayesMode = document.getElementById("bayes-mode");
  function setBayesGroup(el, hidden) {
    if (!el) return;
    el.hidden = hidden;
    var inputs = el.querySelectorAll("input");
    for (var i = 0; i < inputs.length; i++) inputs[i].disabled = hidden;
  }
  function syncBayesMode() {
    if (!bayesMode) return;
    var counts = bayesMode.value === "counts";
    setBayesGroup(document.getElementById("bayes-prob-only"), counts);
    setBayesGroup(document.getElementById("bayes-count-only"), !counts);
  }
  if (bayesMode) {
    bayesMode.addEventListener("change", function () {
      var counts = bayesMode.value === "counts";
      if (counts) {
        var phIn = parseFloat(document.getElementById("bayes-ph").value);
        var nIn = parseInt(document.getElementById("bayes-n").value, 10);
        if (isFinite(phIn) && phIn >= 0 && phIn <= 1 && isFinite(nIn) && nIn >= 1) {
          var hRound = Math.round(phIn * nIn);
          if (hRound < 0) hRound = 0;
          if (hRound > nIn) hRound = nIn;
          document.getElementById("bayes-h").value = String(hRound);
        }
      } else {
        var nBack = parseInt(document.getElementById("bayes-n").value, 10);
        var hBack = parseInt(document.getElementById("bayes-h").value, 10);
        if (isFinite(nBack) && nBack >= 1 && isFinite(hBack) && hBack >= 0 && hBack <= nBack) {
          document.getElementById("bayes-ph").value = formatNum(hBack / nBack);
        }
      }
      syncBayesMode();
    });
    syncBayesMode();
  }

  var bayesForm = document.getElementById("bayes-form");
  if (bayesForm) {
    bayesForm.addEventListener("submit", function (e) {
      e.preventDefault();
    });
  }

  wireCalc(
    { compute: "bayes-compute", reset: "bayes-reset", result: "bayes-result", amount: "bayes-amount", detail: "bayes-detail", error: "bayes-error" },
    function (api) {
      var mode = bayesMode ? bayesMode.value : "prob";
      var ph;
      var countNote = null;
      if (mode === "counts") {
        var n = parseIntStrict(document.getElementById("bayes-n"), "Population N", 1, 1000000000);
        var h = parseIntStrict(document.getElementById("bayes-h"), "Count with H", 0, n);
        ph = h / n;
        countNote = { n: n, h: h };
      } else {
        ph = bayesUnit(parseNum(document.getElementById("bayes-ph"), "Prior P(H)"), "Prior P(H)");
      }
      var peh = bayesUnit(parseNum(document.getElementById("bayes-peh"), "P(E|H)"), "P(E|H)");
      var penh = bayesUnit(parseNum(document.getElementById("bayes-penh"), "P(E|not H)"), "P(E|not H)");
      var pNot = 1 - ph;
      var jointH = peh * ph;
      var jointNot = penh * pNot;
      var pe = jointH + jointNot;
      if (!(pe > 0) || !isFinite(pe)) {
        throw new Error("The evidence has probability 0 under both hypotheses, so the posterior is undefined.");
      }
      var post = jointH / pe;
      if (post < 0 && post > -1e-12) post = 0;
      if (post > 1 && post < 1 + 1e-12) post = 1;
      if (!(post >= 0 && post <= 1) || !isFinite(post)) {
        throw new Error("The posterior is not a probability. Check the inputs.");
      }
      var postNot = 1 - post;
      if (postNot < 0 && postNot > -1e-12) postNot = 0;
      if (postNot > 1 && postNot < 1 + 1e-12) postNot = 1;
      var full = formatNum(post);
      var shortText = bayesHeadline(post);
      var sign = full === shortText ? "=" : "≈";
      var lines = [];
      lines.push(sign === "=" ? bayesPct(post) + "." : "About " + bayesPct(post) + ".");
      if (countNote) {
        lines.push("Count mode prior P(H) = " + countNote.h + " / " + countNote.n + " = " + formatNum(ph));
        lines.push("Expected true positives = " + formatNum(peh) + " × " + countNote.h + " = " + formatNum(peh * countNote.h));
        lines.push("Expected false positives = " + formatNum(penh) + " × " + (countNote.n - countNote.h) + " = " + formatNum(penh * (countNote.n - countNote.h)));
      }
      lines.push("P(not H) = 1 − " + formatNum(ph) + " = " + formatNum(pNot));
      lines.push("Evidence from H = P(E|H) × P(H) = " + formatNum(peh) + " × " + formatNum(ph) + " = " + formatNum(jointH));
      lines.push("Evidence from not H = P(E|not H) × P(not H) = " + formatNum(penh) + " × " + formatNum(pNot) + " = " + formatNum(jointNot));
      lines.push("P(E) = " + formatNum(jointH) + " + " + formatNum(jointNot) + " = " + formatNum(pe));
      lines.push("P(H|E) = " + formatNum(jointH) + " / " + formatNum(pe) + " " + sign + " " + full);
      lines.push("P(not H|E) " + sign + " " + formatNum(postNot));
      if (ph > 0 && ph < 1 && peh > 0 && penh > 0 && postNot > 0) {
        lines.push("Likelihood ratio P(E|H) / P(E|not H) = " + formatNum(peh / penh));
        lines.push("Prior odds P(H) / P(not H) = " + formatNum(ph / pNot));
        lines.push("Posterior odds P(H|E) / P(not H|E) = " + formatNum(post / postNot));
      } else if (penh === 0) {
        lines.push("P(E|not H) is 0, so every time the evidence occurs it comes from H.");
      } else if (peh === 0) {
        lines.push("P(E|H) is 0, so the evidence never comes from H. The posterior is 0.");
      } else if (ph === 0) {
        lines.push("The prior is 0, so the posterior stays 0 when the evidence can still come from not H.");
      } else if (ph === 1) {
        lines.push("The prior is 1, so the posterior stays 1 when the evidence can occur under H.");
      }
      lines.push("Educational use only.");
      api.showResult("P(H|E) " + sign + " " + shortText, lines.join("\n"));
    },
    function () {
      if (bayesMode) bayesMode.value = "prob";
      document.getElementById("bayes-ph").value = "0.01";
      document.getElementById("bayes-n").value = "10000";
      document.getElementById("bayes-h").value = "100";
      document.getElementById("bayes-peh").value = "0.99";
      document.getElementById("bayes-penh").value = "0.05";
      syncBayesMode();
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

  /* ---------- Gradient and directional derivative ---------- */
  /* Same whitelist idea as buildFn: only arithmetic and named functions survive, then new Function. Not eval of arbitrary code. */
  function buildFnXYZ(expr) {
    var cleaned = String(expr).trim().toLowerCase()
      .replace(/\^/g, "**")
      .replace(/\bpi\b/g, "Math.PI")
      .replace(/\be\b/g, "Math.E");
    if (!cleaned) throw new Error("Enter a function of x and y, or of x, y, and z.");
    var marked = cleaned
      .replace(/Math\.(PI|E)/g, "")
      .replace(/\b(sin|cos|tan|sqrt|abs|log|exp)\b/g, "")
      .replace(/\*\*/g, "#");
    var compact = marked.replace(/\s/g, "");
    if (/[xyz]{2,}/i.test(compact)) {
      throw new Error("Write a multiplication sign between variables. xy is not x times y.");
    }
    if (/[0-9.][xyz]|[xyz][0-9.]/i.test(compact)) {
      throw new Error("Write a multiplication sign between a number and a variable. 2x is not 2*x.");
    }
    var test = marked.replace(/#/g, "");
    if (!/^[0-9xyz+\-*/().\s]*$/i.test(test)) {
      throw new Error("Unsupported characters in the expression. Use x, y, z, +, −, *, /, ^, parentheses, and sin, cos, tan, sqrt, abs, log, exp, pi, or e.");
    }
    var mapped = cleaned
      .replace(/\bsin\(/g, "Math.sin(")
      .replace(/\bcos\(/g, "Math.cos(")
      .replace(/\btan\(/g, "Math.tan(")
      .replace(/\bsqrt\(/g, "Math.sqrt(")
      .replace(/\babs\(/g, "Math.abs(")
      .replace(/\blog\(/g, "Math.log(")
      .replace(/\bexp\(/g, "Math.exp(");
    try {
      return new Function("x", "y", "z", "return (" + mapped + ");");
    } catch (err) {
      throw new Error("Could not parse the expression. Check parentheses and operators.");
    }
  }

  (function () {
    if (!document.getElementById("grad-compute")) return;

    function syncGradDim() {
      var show = (document.getElementById("grad-dim").value === "3");
      document.querySelectorAll(".grad-z").forEach(function (el) {
        el.style.display = show ? "" : "none";
      });
    }
    document.getElementById("grad-dim").addEventListener("change", syncGradDim);
    syncGradDim();

    function evalAt(f, x, y, z) {
      try {
        return f(x, y, z);
      } catch (err) {
        throw new Error("Could not evaluate the expression. Check parentheses, operators, and multiplication signs.");
      }
    }

    function centralPartial(f, coords, axis, h) {
      var plus = coords.slice();
      var minus = coords.slice();
      plus[axis] += h;
      minus[axis] -= h;
      var fp = evalAt(f, plus[0], plus[1], plus[2]);
      var fm = evalAt(f, minus[0], minus[1], minus[2]);
      if (!isFinite(fp) || !isFinite(fm)) {
        throw new Error("A sample next to this point is not a finite number. The central difference needs both sides of each variable. Check the domain, or move the point.");
      }
      var est = (fp - fm) / (2 * h);
      if (!isFinite(est)) throw new Error("A partial derivative was not a finite number.");
      return est;
    }

    function formatVec(components) {
      return "⟨" + components.map(formatNum).join(", ") + "⟩";
    }

    function readRequired(id, label) {
      var raw = String((document.getElementById(id) || {}).value || "").trim();
      if (raw === "") throw new Error("Enter a valid number for " + label + ".");
      var v = parseFloat(raw);
      if (!isFinite(v)) throw new Error("Enter a valid number for " + label + ".");
      return v;
    }

    function readOptional(id) {
      var raw = String((document.getElementById(id) || {}).value || "").trim();
      if (raw === "") return null;
      var v = parseFloat(raw);
      if (!isFinite(v)) throw new Error("Enter a valid number for each direction component, or leave the direction blank.");
      return v;
    }

    var examples = {
      "ex-paraboloid": { dim: "2", expr: "x^2+y^2", x: "1", y: "2", z: "0", dx: "3", dy: "4", dz: "0", h: "0.001" },
      "ex-temperature": { dim: "2", expr: "70+2*x-y", x: "1", y: "3", z: "0", dx: "1", dy: "0", dz: "0", h: "0.001" },
      "ex-elevation": { dim: "2", expr: "100-x^2-2*y^2", x: "1", y: "1", z: "0", dx: "1", dy: "0", dz: "0", h: "0.001" },
      "ex-three": { dim: "3", expr: "x*y+z^2", x: "1", y: "2", z: "3", dx: "0", dy: "0", dz: "1", h: "0.001" }
    };

    function applyExample(ex) {
      document.getElementById("grad-dim").value = ex.dim;
      document.getElementById("grad-expr").value = ex.expr;
      document.getElementById("grad-x").value = ex.x;
      document.getElementById("grad-y").value = ex.y;
      document.getElementById("grad-z").value = ex.z;
      document.getElementById("grad-dx").value = ex.dx;
      document.getElementById("grad-dy").value = ex.dy;
      document.getElementById("grad-dz").value = ex.dz;
      document.getElementById("grad-h").value = ex.h;
      syncGradDim();
      document.getElementById("grad-compute").click();
    }

    Object.keys(examples).forEach(function (id) {
      var button = document.getElementById(id);
      if (!button) return;
      button.addEventListener("click", function () { applyExample(examples[id]); });
    });

    wireCalc(
      { compute: "grad-compute", reset: "grad-reset", result: "grad-result", amount: "grad-amount", detail: "grad-detail", error: "grad-error" },
      function (api) {
        var expr = (document.getElementById("grad-expr").value || "").trim();
        if (!expr) throw new Error("Enter a function of x and y, or of x, y, and z. For example, x^2+y^2.");
        var dim = (document.getElementById("grad-dim").value === "3") ? 3 : 2;
        if (dim === 2 && /\bz\b/i.test(expr)) {
          throw new Error("This expression uses z. Switch to three variables, or remove z.");
        }
        var x = readRequired("grad-x", "x");
        var y = readRequired("grad-y", "y");
        var z = dim === 3 ? readRequired("grad-z", "z") : 0;
        var h = readRequired("grad-h", "the step size h");
        if (!(h > 0)) throw new Error("Step size h must be a positive number. Try 0.001.");
        if (h > 1) throw new Error("Choose a step size h of at most 1 for a meaningful estimate.");

        var dx = readOptional("grad-dx");
        var dy = readOptional("grad-dy");
        var dz = dim === 3 ? readOptional("grad-dz") : null;
        var parts = dim === 3 ? [dx, dy, dz] : [dx, dy];
        var anyDir = parts.some(function (v) { return v !== null; });
        var allDir = parts.every(function (v) { return v !== null; });
        if (anyDir && !allDir) {
          throw new Error("Fill every component of the direction, or leave the whole direction blank.");
        }
        var dir = null;
        if (allDir && anyDir) {
          dir = dim === 3 ? [dx, dy, dz] : [dx, dy];
          var dmag = Math.sqrt(dir.reduce(function (s, c) { return s + c * c; }, 0));
          if (!(dmag >= 1e-14)) {
            throw new Error("The direction vector is zero, so it does not name a direction. Enter a nonzero vector, or leave the direction blank.");
          }
        }

        var f = buildFnXYZ(expr);
        var coords = [x, y, z];
        var f0 = evalAt(f, x, y, z);
        if (!isFinite(f0)) {
          throw new Error("f at this point is not a finite number. The formula may be outside its domain.");
        }
        var names = dim === 3 ? ["x", "y", "z"] : ["x", "y"];
        var grad = names.map(function (name, i) {
          return centralPartial(f, coords, i, h);
        });
        var mag = Math.sqrt(grad.reduce(function (s, c) { return s + c * c; }, 0));
        if (!isFinite(mag)) throw new Error("The gradient magnitude was not a finite number.");

        var lines = [];
        lines.push("f at the point ≈ " + formatNum(f0));
        names.forEach(function (name, i) {
          lines.push("Partial with respect to " + name + " ≈ " + formatNum(grad[i]));
        });
        lines.push("Gradient magnitude ≈ " + formatNum(mag) + ", the fastest rate of increase.");

        var flat = mag < 1e-8;
        if (flat) {
          lines.push("The gradient is about zero, so steepest ascent has no single direction.");
        } else {
          lines.push("Unit direction of steepest ascent ≈ " + formatVec(grad.map(function (c) { return c / mag; })) + ".");
        }

        var amount = "∇f ≈ " + formatVec(grad);
        if (dir) {
          var len = Math.sqrt(dir.reduce(function (s, c) { return s + c * c; }, 0));
          var unit = dir.map(function (c) { return c / len; });
          var du = 0;
          for (var i = 0; i < grad.length; i++) du += grad[i] * unit[i];
          if (!isFinite(du)) throw new Error("The directional derivative was not a finite number.");
          lines.push("Normalized direction u ≈ " + formatVec(unit) + ".");
          lines.push("Directional derivative D_u f ≈ " + formatNum(du) + ".");
          if (Math.abs(du) < 1e-8) {
            lines.push("About zero means this direction is level to first order.");
          } else if (du > 0) {
            lines.push("Positive means f increases in this direction.");
          } else {
            lines.push("Negative means f decreases in this direction.");
          }
          if (flat) {
            lines.push("The angle with the gradient is not defined, because the gradient has no direction.");
          } else {
            var cos = du / mag;
            if (cos > 1) cos = 1;
            if (cos < -1) cos = -1;
            var rad = Math.acos(cos);
            var deg = rad * 180 / Math.PI;
            lines.push("Angle between u and the gradient ≈ " + formatNum(deg) + " degrees (" + formatNum(rad) + " radians).");
          }
          amount += ", directional derivative ≈ " + formatNum(du);
        }

        lines.push("Central difference with step h = " + formatNum(h) + ". These partial derivatives are numerical approximations, not symbolic derivatives.");
        api.showResult(amount, lines.join("\n"));
      },
      function () {
        document.getElementById("grad-dim").value = "2";
        document.getElementById("grad-expr").value = "x^2+y^2";
        document.getElementById("grad-x").value = "1";
        document.getElementById("grad-y").value = "2";
        document.getElementById("grad-z").value = "0";
        document.getElementById("grad-dx").value = "3";
        document.getElementById("grad-dy").value = "4";
        document.getElementById("grad-dz").value = "0";
        document.getElementById("grad-h").value = "0.001";
        syncGradDim();
      }
    );
  })();

  /* ---------- Divergence and curl ---------- */
  (function () {
    if (!document.getElementById("dc-compute")) return;

    function syncDim() {
      var show = (document.getElementById("dc-dim").value === "3");
      document.querySelectorAll(".dc-z").forEach(function (el) {
        el.style.display = show ? "" : "none";
      });
    }
    document.getElementById("dc-dim").addEventListener("change", syncDim);
    syncDim();

    function readRequired(id, label) {
      var raw = String((document.getElementById(id) || {}).value || "").trim();
      if (raw === "") throw new Error("Enter a valid number for " + label + ".");
      var v = parseFloat(raw);
      if (!isFinite(v)) throw new Error("Enter a valid number for " + label + ".");
      return v;
    }

    function buildComponent(expr, name, dim) {
      var trimmed = String(expr || "").trim();
      if (!trimmed) throw new Error("Enter an expression for " + name + ".");
      if (dim === 2 && /\bz\b/i.test(trimmed)) {
        throw new Error(name + " uses z. Switch to a field in space, or remove z.");
      }
      try {
        return buildFnXYZ(trimmed);
      } catch (err) {
        var msg = (err && err.message) ? err.message : "Could not parse the expression.";
        if (msg.indexOf("Enter a function") === 0) msg = "Enter an expression for " + name + ".";
        throw new Error(name + ": " + msg);
      }
    }

    function evalComponent(fn, x, y, z, name) {
      var v;
      try {
        v = fn(x, y, z);
      } catch (err) {
        throw new Error("Could not evaluate " + name + ". Check parentheses, operators, and multiplication signs.");
      }
      return v;
    }

    function centralPartial(fn, coords, axis, h, name) {
      var plus = coords.slice();
      var minus = coords.slice();
      plus[axis] += h;
      minus[axis] -= h;
      if (plus[axis] === coords[axis] || minus[axis] === coords[axis]) {
        throw new Error("The step is too small compared with this point. Increase h, or choose a point closer to the origin.");
      }
      var fp = evalComponent(fn, plus[0], plus[1], plus[2], name);
      var fm = evalComponent(fn, minus[0], minus[1], minus[2], name);
      if (!isFinite(fp) || !isFinite(fm)) {
        throw new Error(name + " is not a finite number on both sides of this point. The central difference needs both samples. Move the point, or use a smaller step.");
      }
      var est = (fp - fm) / (2 * h);
      if (!isFinite(est)) throw new Error("A partial derivative of " + name + " was not a finite number.");
      return est;
    }

    function showNum(n) {
      if (isFinite(n) && Math.abs(n) < 1e-8) return formatNum(0);
      return formatNum(n);
    }

    function formatVec(components) {
      return "⟨" + components.map(showNum).join(", ") + "⟩";
    }

    function nearZero(v) {
      return Math.abs(v) < 1e-6;
    }

    function sourceSentence(divV) {
      if (nearZero(divV)) {
        return "Divergence is about zero, so this point has little source or sink tendency. Inflow and outflow balance, to the accuracy of this estimate.";
      }
      if (divV > 0) {
        return "Divergence is positive, so this point has a source tendency. A tiny region sends out more of the field than it takes in.";
      }
      return "Divergence is negative, so this point has a sink tendency. A tiny region takes in more of the field than it sends out.";
    }

    function spinSentence(scalarCurl, inSpace) {
      var which = inSpace ? "The z component of the curl" : "The scalar curl";
      if (nearZero(scalarCurl)) {
        return which + " is about zero, so the arrows in this picture show little counterclockwise or clockwise tendency.";
      }
      if (scalarCurl > 0) {
        return which + " is positive, so the arrows in this picture have a counterclockwise rotation tendency.";
      }
      return which + " is negative, so the arrows in this picture have a clockwise rotation tendency.";
    }

    var lastPlot = null;

    function drawField(plot) {
      var canvas = document.getElementById("dc-plot");
      var legend = document.getElementById("dc-reading");
      if (!canvas || !canvas.getContext) {
        if (legend) legend.textContent = plot.reading;
        return;
      }
      var n = 11;
      var span = 2;
      var x0 = plot.x;
      var y0 = plot.y;
      var z0 = plot.z;
      var samples = [];
      var mags = [];
      var skipped = 0;
      var i, j, x, y, vx, vy, mag;
      for (j = 0; j < n; j++) {
        for (i = 0; i < n; i++) {
          x = x0 + ((i / (n - 1)) * 2 - 1) * span;
          y = y0 + ((j / (n - 1)) * 2 - 1) * span;
          try {
            vx = plot.p(x, y, z0);
            vy = plot.q(x, y, z0);
          } catch (err) {
            vx = NaN;
            vy = NaN;
          }
          if (!isFinite(vx) || !isFinite(vy)) {
            skipped++;
            samples.push(null);
            continue;
          }
          mag = Math.sqrt(vx * vx + vy * vy);
          if (isFinite(mag) && mag > 0) mags.push(mag);
          samples.push({ x: x, y: y, vx: vx, vy: vy, mag: mag });
        }
      }
      mags.sort(function (a, b) { return a - b; });
      var ref = mags.length ? mags[Math.min(mags.length - 1, Math.floor(mags.length * 0.8))] : 0;

      var cssW = canvas.clientWidth || 480;
      if (!(cssW > 40)) cssW = 480;
      var cssH = cssW;
      var dpr = Math.min((typeof window !== "undefined" && window.devicePixelRatio) || 1, 2);
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      canvas.style.height = cssH + "px";
      var ctx = canvas.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      var pad = 28;
      var plotW = cssW - pad * 2;
      var plotH = cssH - pad * 2;
      var xMin = x0 - span;
      var xMax = x0 + span;
      var yMin = y0 - span;
      var yMax = y0 + span;
      function xPix(xv) { return pad + (xv - xMin) / (xMax - xMin) * plotW; }
      function yPix(yv) { return pad + (yMax - yv) / (yMax - yMin) * plotH; }

      ctx.clearRect(0, 0, cssW, cssH);
      ctx.fillStyle = "#fffcf7";
      ctx.fillRect(0, 0, cssW, cssH);
      ctx.strokeStyle = "#e4dfd4";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (i = 0; i < n; i++) {
        x = x0 + ((i / (n - 1)) * 2 - 1) * span;
        y = y0 + ((i / (n - 1)) * 2 - 1) * span;
        ctx.moveTo(xPix(x), pad);
        ctx.lineTo(xPix(x), pad + plotH);
        ctx.moveTo(pad, yPix(y));
        ctx.lineTo(pad + plotW, yPix(y));
      }
      ctx.stroke();

      ctx.strokeStyle = "#b7b1a4";
      ctx.beginPath();
      if (xMin < 0 && xMax > 0) {
        ctx.moveTo(xPix(0), pad);
        ctx.lineTo(xPix(0), pad + plotH);
      }
      if (yMin < 0 && yMax > 0) {
        ctx.moveTo(pad, yPix(0));
        ctx.lineTo(pad + plotW, yPix(0));
      }
      ctx.stroke();
      ctx.strokeStyle = "#d8d2c6";
      ctx.strokeRect(pad, pad, plotW, plotH);

      var cell = plotW / n;
      ctx.strokeStyle = "#2f4a7a";
      ctx.fillStyle = "#2f4a7a";
      ctx.lineWidth = 1.4;
      ctx.lineCap = "round";
      samples.forEach(function (s) {
        if (!s) return;
        var px = xPix(s.x);
        var py = yPix(s.y);
        if (!(s.mag > 1e-10) || !(ref > 0)) {
          ctx.beginPath();
          ctx.arc(px, py, 1.6, 0, Math.PI * 2);
          ctx.fill();
          return;
        }
        var len = Math.min(cell * 0.78, (s.mag / ref) * cell * 0.62);
        if (len < 4) {
          ctx.beginPath();
          ctx.arc(px, py, 1.6, 0, Math.PI * 2);
          ctx.fill();
          return;
        }
        var ux = s.vx / s.mag;
        var uy = s.vy / s.mag;
        var x2 = px + ux * len / 2;
        var y2 = py - uy * len / 2;
        var x1 = px - ux * len / 2;
        var y1 = py + uy * len / 2;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        var ang = Math.atan2(y2 - y1, x2 - x1);
        var head = Math.min(8, len * 0.38);
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - head * Math.cos(ang - 0.45), y2 - head * Math.sin(ang - 0.45));
        ctx.lineTo(x2 - head * Math.cos(ang + 0.45), y2 - head * Math.sin(ang + 0.45));
        ctx.closePath();
        ctx.fill();
      });

      var mx = xPix(x0);
      var my = yPix(y0);
      ctx.beginPath();
      ctx.arc(mx, my, 6, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#8b5a2b";
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(mx, my, 2.4, 0, Math.PI * 2);
      ctx.fillStyle = "#8b5a2b";
      ctx.fill();

      ctx.fillStyle = "#4a5160";
      ctx.font = "12px Segoe UI, system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText("y", pad + 4, 6);
      ctx.textAlign = "right";
      ctx.textBaseline = "bottom";
      ctx.fillText("x", cssW - 6, cssH - 4);

      var note = plot.reading;
      if (skipped > 0) {
        note += " Some sample arrows are omitted because the field was not finite there.";
      }
      if (legend) legend.textContent = note;
      canvas.setAttribute("aria-label", "Vector field arrows centered at the evaluation point. " + note);
    }

    window.addEventListener("resize", function () {
      var result = document.getElementById("dc-result");
      if (lastPlot && result && result.classList.contains("visible")) drawField(lastPlot);
    });

    var examples = {
      "ex-rotation": { dim: "2", p: "-y", q: "x", r: "0", x: "1", y: "0", z: "0", h: "0.001" },
      "ex-radial": { dim: "2", p: "x", q: "y", r: "0", x: "1", y: "1", z: "0", h: "0.001" },
      "ex-shear": { dim: "2", p: "y", q: "0", r: "0", x: "1", y: "1", z: "0", h: "0.001" },
      "ex-gradient": { dim: "2", p: "y", q: "x", r: "0", x: "1", y: "2", z: "0", h: "0.001" },
      "ex-three": { dim: "3", p: "-y", q: "x", r: "0", x: "1", y: "0", z: "0", h: "0.001" }
    };

    function applyExample(ex) {
      document.getElementById("dc-dim").value = ex.dim;
      document.getElementById("dc-p").value = ex.p;
      document.getElementById("dc-q").value = ex.q;
      document.getElementById("dc-r").value = ex.r;
      document.getElementById("dc-x").value = ex.x;
      document.getElementById("dc-y").value = ex.y;
      document.getElementById("dc-z").value = ex.z;
      document.getElementById("dc-h").value = ex.h;
      syncDim();
      document.getElementById("dc-compute").click();
    }

    Object.keys(examples).forEach(function (id) {
      var button = document.getElementById(id);
      if (!button) return;
      button.addEventListener("click", function () { applyExample(examples[id]); });
    });

    wireCalc(
      { compute: "dc-compute", reset: "dc-reset", result: "dc-result", amount: "dc-amount", detail: "dc-detail", error: "dc-error" },
      function (api) {
        var dim = (document.getElementById("dc-dim").value === "3") ? 3 : 2;
        var pExpr = document.getElementById("dc-p").value;
        var qExpr = document.getElementById("dc-q").value;
        var rExpr = dim === 3 ? document.getElementById("dc-r").value : "0";
        var P = buildComponent(pExpr, "P", dim);
        var Q = buildComponent(qExpr, "Q", dim);
        var R = dim === 3 ? buildComponent(rExpr, "R", dim) : null;
        var x = readRequired("dc-x", "x");
        var y = readRequired("dc-y", "y");
        var z = dim === 3 ? readRequired("dc-z", "z") : 0;
        var h = readRequired("dc-h", "the step size h");
        if (!(h > 0)) throw new Error("Step size h must be a positive number. Try 0.001.");
        if (h > 1) throw new Error("Choose a step size h of at most 1 for a meaningful estimate.");
        if (h < 1e-8) throw new Error("Step size h is too small for a stable central difference. Try 0.001.");

        var coords = [x, y, z];
        var p0 = evalComponent(P, x, y, z, "P");
        var q0 = evalComponent(Q, x, y, z, "Q");
        var r0 = R ? evalComponent(R, x, y, z, "R") : 0;
        if (!isFinite(p0) || !isFinite(q0) || !isFinite(r0)) {
          throw new Error("The field is not defined at this point, or a component is not a finite number. Move the point, or repair the formula.");
        }

        var axes = dim === 3 ? ["x", "y", "z"] : ["x", "y"];
        var comps = dim === 3 ? [
          { name: "P", fn: P },
          { name: "Q", fn: Q },
          { name: "R", fn: R }
        ] : [
          { name: "P", fn: P },
          { name: "Q", fn: Q }
        ];
        var partial = comps.map(function (comp) {
          return axes.map(function (axisName, axis) {
            return centralPartial(comp.fn, coords, axis, h, comp.name);
          });
        });

        var divV, curlZ, curl, amount, lines;
        lines = [];
        if (dim === 2) {
          lines.push("F at the point ≈ " + formatVec([p0, q0]));
        } else {
          lines.push("F at the point ≈ " + formatVec([p0, q0, r0]));
        }
        comps.forEach(function (comp, ci) {
          axes.forEach(function (axisName, ai) {
            lines.push("Partial of " + comp.name + " with respect to " + axisName + " ≈ " + showNum(partial[ci][ai]));
          });
        });

        if (dim === 2) {
          divV = partial[0][0] + partial[1][1];
          curlZ = partial[1][0] - partial[0][1];
          if (!isFinite(divV) || !isFinite(curlZ)) throw new Error("Divergence or curl was not a finite number.");
          lines.push("Divergence ≈ " + showNum(divV) + ", from Px + Qy.");
          lines.push("Scalar curl ≈ " + showNum(curlZ) + ", from Qx minus Py.");
          amount = "Divergence ≈ " + showNum(divV) + ", scalar curl ≈ " + showNum(curlZ);
        } else {
          var Ry = partial[2][1];
          var Qz = partial[1][2];
          var Pz = partial[0][2];
          var Rx = partial[2][0];
          var Qx = partial[1][0];
          var Py = partial[0][1];
          divV = partial[0][0] + partial[1][1] + partial[2][2];
          curl = [Ry - Qz, Pz - Rx, Qx - Py];
          curlZ = curl[2];
          var curlMag = Math.sqrt(curl[0] * curl[0] + curl[1] * curl[1] + curl[2] * curl[2]);
          if (!isFinite(divV) || !isFinite(curlMag)) throw new Error("Divergence or curl was not a finite number.");
          lines.push("Divergence ≈ " + showNum(divV) + ", from Px + Qy + Rz.");
          lines.push("Curl ≈ " + formatVec(curl) + ".");
          lines.push("Curl x component ≈ " + showNum(curl[0]) + ", from Ry minus Qz.");
          lines.push("Curl y component ≈ " + showNum(curl[1]) + ", from Pz minus Rx.");
          lines.push("Curl z component ≈ " + showNum(curl[2]) + ", from Qx minus Py.");
          lines.push("Curl magnitude ≈ " + showNum(curlMag) + ".");
          amount = "Divergence ≈ " + showNum(divV) + ", curl ≈ " + formatVec(curl);
        }

        var reading = (dim === 2)
          ? "The arrows are the field on a square window centered at the point."
          : "The arrows are P and Q on the horizontal slice z = " + formatNum(z) + ", centered at the point.";
        reading += " The dot marks the evaluation point. " + sourceSentence(divV) + " " + spinSentence(curlZ, dim === 3);
        if (dim === 3) {
          reading += " The full curl vector may point out of this slice. Its direction is the axis of local rotation, in the right hand sense, and its length is the strength of that spin.";
        }
        lines.push(reading);
        lines.push("Central difference with step h = " + formatNum(h) + ". These partial derivatives are numerical approximations, not symbolic derivatives, and they are not a proof.");

        api.showResult(amount, lines.join("\n"));
        lastPlot = { p: P, q: Q, x: x, y: y, z: z, reading: reading };
        drawField(lastPlot);
      },
      function () {
        document.getElementById("dc-dim").value = "2";
        document.getElementById("dc-p").value = "-y";
        document.getElementById("dc-q").value = "x";
        document.getElementById("dc-r").value = "0";
        document.getElementById("dc-x").value = "1";
        document.getElementById("dc-y").value = "0";
        document.getElementById("dc-z").value = "0";
        document.getElementById("dc-h").value = "0.001";
        syncDim();
        lastPlot = null;
        var legend = document.getElementById("dc-reading");
        if (legend) legend.textContent = "";
      }
    );
  })();

  /* ---------- Epsilon delta finder ---------- */
  var ED_CAP = 10;
  var ED_FLOOR = 1e-10;

  function edEval(f, x) {
    try {
      return f(x);
    } catch (err) {
      return NaN;
    }
  }

  function edPairFails(f, a, L, eps, h) {
    var sign, x, y, err, worst;
    worst = null;
    for (sign = -1; sign <= 1; sign += 2) {
      x = a + sign * h;
      y = edEval(f, x);
      err = isFinite(y) ? Math.abs(y - L) : Infinity;
      if (!isFinite(y) || !(err < eps)) {
        if (!worst || err > worst.err) worst = { x: x, y: y, dist: h, err: err };
      }
    }
    return worst;
  }

  function edScan(f, a, L, eps, delta) {
    var nLin = 360;
    var nEdge = 400;
    var i, h, hit, closest, n;
    closest = null;
    n = 0;
    function note(hVal) {
      if (!(hVal > 0) || hVal >= delta || hVal < ED_FLOOR) return;
      n += 2;
      hit = edPairFails(f, a, L, eps, hVal);
      if (hit && (!closest || hit.dist < closest.dist - 1e-15)) closest = hit;
    }
    for (i = 1; i <= nLin; i++) note(delta * i / (nLin + 1));
    for (i = 1; i <= nEdge; i++) note(delta * (1 - i / (nEdge * 80)));
    h = delta * 0.5;
    i = 0;
    while (h >= ED_FLOOR && i < 40) {
      note(h);
      h *= 0.5;
      i++;
    }
    return { failed: !!closest, closest: closest, n: n };
  }

  function findEdDelta(f, a, L, eps) {
    var h, hit, allFail, witness, total, capScan, lo, hi, iter, mid, sc, steps, s, hh, b, rounds, finalScan;
    total = 0;
    allFail = true;
    witness = null;
    h = 1e-1;
    while (h >= ED_FLOOR) {
      hit = edPairFails(f, a, L, eps, h);
      total += 2;
      if (hit) {
        if (!witness || hit.dist < witness.dist) witness = hit;
      } else {
        allFail = false;
        break;
      }
      h /= 10;
    }
    if (allFail) {
      return { status: "none", delta: null, cap: ED_CAP, witness: witness, n: total };
    }

    capScan = edScan(f, a, L, eps, ED_CAP);
    total += capScan.n;
    if (!capScan.failed) {
      return { status: "capped", delta: ED_CAP, cap: ED_CAP, witness: null, n: total };
    }

    hi = capScan.closest.dist;
    lo = 0;
    for (iter = 0; iter < 40; iter++) {
      mid = (lo + hi) / 2;
      if (!(mid > lo && mid < hi)) break;
      sc = edScan(f, a, L, eps, mid);
      total += sc.n;
      if (sc.failed) hi = sc.closest.dist;
      else lo = mid;
    }

    steps = 240;
    for (s = 1; s <= steps; s++) {
      hh = lo + (hi - lo) * s / (steps + 1);
      if (!(hh > lo && hh < hi)) continue;
      b = edPairFails(f, a, L, eps, hh);
      total += 2;
      if (b) {
        hi = b.dist;
        witness = b;
        break;
      }
    }

    rounds = 0;
    while (rounds < 5) {
      sc = edScan(f, a, L, eps, hi);
      total += sc.n;
      if (!sc.failed) break;
      if (sc.closest.dist < hi * (1 - 1e-12)) {
        hi = sc.closest.dist;
        witness = sc.closest;
        rounds++;
        continue;
      }
      witness = sc.closest;
      break;
    }

    finalScan = edScan(f, a, L, eps, hi);
    total += finalScan.n;
    if (finalScan.failed) {
      hi = finalScan.closest.dist;
      witness = finalScan.closest;
      finalScan = edScan(f, a, L, eps, hi);
      total += finalScan.n;
      if (finalScan.failed) {
        return { status: "none", delta: null, cap: ED_CAP, witness: finalScan.closest, n: total };
      }
    }

    if (!(hi > ED_FLOOR)) {
      return { status: "none", delta: null, cap: ED_CAP, witness: witness, n: total };
    }
    return { status: "found", delta: hi, cap: ED_CAP, witness: witness || capScan.closest, n: total };
  }

  function edFormatY(y) {
    if (!isFinite(y)) return "not a finite number";
    return formatNum(y);
  }

  function drawEdPlot(f, a, L, eps, found) {
    var canvas = document.getElementById("ed-plot");
    var legend = document.getElementById("ed-legend");
    if (!canvas || !canvas.getContext) return;
    var span = 2;
    if (found.status === "found" && found.delta > 0) span = found.delta * 2.6;
    if (!(span > 0) || !isFinite(span)) span = 2;
    var xMin = a - span;
    var xMax = a + span;
    var n = 280;
    var pts = [];
    var i, x, y, escape;
    for (i = 0; i <= n; i++) {
      x = xMin + (xMax - xMin) * i / n;
      if (Math.abs(x - a) <= 1e-12) {
        pts.push({ x: x, y: NaN, escape: false, atA: true });
        continue;
      }
      y = edEval(f, x);
      escape = !isFinite(y) || !(Math.abs(y - L) < eps);
      pts.push({ x: x, y: y, escape: escape, atA: false });
    }

    var yLo = L - eps;
    var yHi = L + eps;
    var limit = Math.max(8 * eps, 2);
    for (i = 0; i < pts.length; i++) {
      y = pts[i].y;
      if (!isFinite(y)) continue;
      if (Math.abs(y - L) > limit) continue;
      if (y < yLo) yLo = y;
      if (y > yHi) yHi = y;
    }
    if (!(yHi > yLo)) {
      yLo = L - 1;
      yHi = L + 1;
    }
    var yPad = 0.08 * (yHi - yLo);
    yLo -= yPad;
    yHi += yPad;

    var cssW = canvas.clientWidth || 560;
    if (cssW < 280) cssW = 560;
    var cssH = Math.round(cssW * 360 / 640);
    var dpr = (typeof window !== "undefined" && window.devicePixelRatio) || 1;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.height = cssH + "px";
    var ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var W = cssW;
    var H = cssH;
    var padL = 52;
    var padR = 14;
    var padT = 16;
    var padB = 32;
    var plotW = W - padL - padR;
    var plotH = H - padT - padB;

    function xPix(xv) {
      return padL + (xv - xMin) / (xMax - xMin) * plotW;
    }
    function yPix(yv) {
      return padT + (yHi - yv) / (yHi - yLo) * plotH;
    }

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);

    if (found.status === "found" || found.status === "capped") {
      var dLeft = Math.max(xMin, a - found.delta);
      var dRight = Math.min(xMax, a + found.delta);
      ctx.fillStyle = "rgba(139, 90, 43, 0.14)";
      ctx.fillRect(xPix(dLeft), padT, Math.max(1, xPix(dRight) - xPix(dLeft)), plotH);
    }

    var bandTop = yPix(L + eps);
    var bandBot = yPix(L - eps);
    ctx.fillStyle = "rgba(47, 74, 122, 0.16)";
    ctx.fillRect(padL, bandTop, plotW, Math.max(1, bandBot - bandTop));

    ctx.strokeStyle = "#d8d2c6";
    ctx.lineWidth = 1;
    ctx.strokeRect(padL, padT, plotW, plotH);

    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = "#2f4a7a";
    ctx.beginPath();
    ctx.moveTo(padL, yPix(L));
    ctx.lineTo(padL + plotW, yPix(L));
    ctx.stroke();
    ctx.strokeStyle = "#8b5a2b";
    ctx.beginPath();
    ctx.moveTo(xPix(a), padT);
    ctx.lineTo(xPix(a), padT + plotH);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    var pen = false;
    for (i = 0; i < pts.length; i++) {
      y = pts[i].y;
      if (!isFinite(y) || y < yLo || y > yHi) {
        pen = false;
        continue;
      }
      if (!pen) {
        ctx.moveTo(xPix(pts[i].x), yPix(y));
        pen = true;
      } else {
        ctx.lineTo(xPix(pts[i].x), yPix(y));
      }
    }
    ctx.strokeStyle = "#243a61";
    ctx.lineWidth = 2;
    ctx.stroke();

    for (i = 0; i < pts.length; i++) {
      if (!pts[i].escape || pts[i].atA) continue;
      y = pts[i].y;
      var px = xPix(pts[i].x);
      var py;
      if (!isFinite(y) || y > yHi) py = padT + 4;
      else if (y < yLo) py = padT + plotH - 4;
      else py = yPix(y);
      ctx.beginPath();
      ctx.fillStyle = "#8b2e2e";
      ctx.arc(px, py, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "#4a5160";
    ctx.font = "12px Segoe UI, system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText("L", padL - 6, yPix(L));
    ctx.fillText("L+ε", padL - 6, yPix(L + eps));
    ctx.fillText("L−ε", padL - 6, yPix(L - eps));
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText("a", xPix(a), padT + plotH + 6);
    ctx.fillText(formatNum(xMin), padL, padT + plotH + 6);
    ctx.fillText(formatNum(xMax), padL + plotW, padT + plotH + 6);

    var summary;
    if (found.status === "found") {
      summary = "Plot of f near a. The horizontal band is the epsilon tolerance around L. The vertical band is the delta window. Red dots are samples that leave the epsilon band.";
    } else if (found.status === "capped") {
      summary = "Plot of f near a. Every sample inside the cap stayed in the epsilon band. The picture is a zoom near a. The accepted window is wider than this plot. Red dots would mark escapes. None appear.";
    } else {
      summary = "Plot of f near a. No vertical delta band is drawn, because no positive delta kept the samples inside the epsilon band. Red dots are samples that leave the band.";
    }
    canvas.setAttribute("aria-label", summary);
    if (legend) legend.textContent = summary;
  }

  (function () {
    if (!document.getElementById("ed-compute")) return;

    var examples = {
      "ed-ex-linear": { expr: "3*x+1", a: "2", L: "7", eps: "0.1" },
      "ed-ex-quadratic": { expr: "x^2", a: "3", L: "9", eps: "0.1" },
      "ed-ex-hole": { expr: "(x^2-1)/(x-1)", a: "1", L: "2", eps: "0.1" },
      "ed-ex-recip": { expr: "1/x", a: "2", L: "0.5", eps: "0.1" },
      "ed-ex-jump": { expr: "abs(x)/x", a: "0", L: "0", eps: "0.5" }
    };

    function applyExample(ex) {
      document.getElementById("ed-expr").value = ex.expr;
      document.getElementById("ed-a").value = ex.a;
      document.getElementById("ed-L").value = ex.L;
      document.getElementById("ed-eps").value = ex.eps;
      document.getElementById("ed-compute").click();
    }

    Object.keys(examples).forEach(function (id) {
      var button = document.getElementById(id);
      if (!button) return;
      button.addEventListener("click", function () { applyExample(examples[id]); });
    });

    wireCalc(
      { compute: "ed-compute", reset: "ed-reset", result: "ed-result", amount: "ed-amount", detail: "ed-detail", error: "ed-error" },
      function (api) {
        var expr = (document.getElementById("ed-expr").value || "").trim();
        if (!expr) throw new Error("Enter a function of x. For example, 3*x+1.");
        var compact = expr.replace(/\s/g, "");
        if (/[0-9.]x|x[0-9.]/i.test(compact)) {
          throw new Error("Write a multiplication sign between a number and x. 3x is not 3*x.");
        }
        var a = parseNum(document.getElementById("ed-a"), "a");
        var L = parseNum(document.getElementById("ed-L"), "the proposed limit L");
        var eps = parseNum(document.getElementById("ed-eps"), "epsilon");
        if (!(eps > 0)) throw new Error("Epsilon must be a positive number. Try 0.1.");
        var f;
        try {
          f = buildFn(expr);
        } catch (err) {
          throw new Error(err.message || "Could not parse the expression.");
        }
        try {
          f(a + 0.1);
        } catch (err) {
          throw new Error("Could not evaluate the expression. Check parentheses and operators.");
        }

        var found = findEdDelta(f, a, L, eps);
        var lines = [];
        var amount;
        if (found.status === "none") {
          amount = "No delta found";
          lines.push("No positive delta kept the sampled points inside the epsilon band.");
          if (found.witness) {
            lines.push(
              "A sampled escape is at x = " + formatNum(found.witness.x) +
              ", where f(x) is " + edFormatY(found.witness.y) +
              " and the absolute error is " + (isFinite(found.witness.err) ? formatNum(found.witness.err) : "not finite") +
              ". That distance from a is " + formatNum(found.witness.dist) + "."
            );
          }
          lines.push("A jump, a wrong proposed limit, or a blowup can do this. The plot marks samples that leave the band around L.");
        } else if (found.status === "capped") {
          amount = "Delta reaches the cap of " + formatNum(found.delta);
          lines.push(
            "Every checked sample with 0 < |x − " + formatNum(a) + "| < " + formatNum(found.delta) +
            " had |f(x) − " + formatNum(L) + "| < " + formatNum(eps) + "."
          );
          lines.push("The search stops at a cap of " + formatNum(ED_CAP) + ". A larger window was not tested. The picture is zoomed near a.");
        } else {
          amount = "Largest sampled delta ≈ " + formatNum(found.delta);
          lines.push(
            "Every checked sample with 0 < |x − " + formatNum(a) + "| < " + formatNum(found.delta) +
            " had |f(x) − " + formatNum(L) + "| < " + formatNum(eps) + "."
          );
          if (found.witness) {
            lines.push(
              "The closest sampled escape is at distance " + formatNum(found.witness.dist) +
              " (x = " + formatNum(found.witness.x) + ", f(x) = " + edFormatY(found.witness.y) +
              "). The window stops at that edge."
            );
          }
        }
        lines.push("Checked " + found.n + " sample values. This is a numerical check, not a proof.");
        api.showResult(amount, lines.join("\n"));
        drawEdPlot(f, a, L, eps, found);
      },
      function () {
        document.getElementById("ed-expr").value = "3*x+1";
        document.getElementById("ed-a").value = "2";
        document.getElementById("ed-L").value = "7";
        document.getElementById("ed-eps").value = "0.1";
      }
    );
  })();
})();
