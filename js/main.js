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

  /* Numerical derivative / slope estimator */
  var calcBtn = document.getElementById("calc-slope");
  if (calcBtn) {
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

    /* Safe-ish evaluator for simple math expressions in x */
    function buildFn(expr) {
      var cleaned = String(expr).trim().toLowerCase()
        .replace(/\^/g, "**")
        .replace(/\bpi\b/g, "Math.PI")
        .replace(/\be\b/g, "Math.E");
      if (!/^[0-9x+\-*/().,\s**mathpie]+$/i.test(cleaned.replace(/Math\.(PI|E|sin|cos|tan|sqrt|abs|log|exp|pow)/g, ""))) {
        /* further sanitize by only allowing known tokens */
      }
      var allowed = /^[0-9x+\-*/().,\s*]+$|Math\.(PI|E|sin|cos|tan|sqrt|abs|log|exp)/;
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

    function formatNum(n) {
      if (!isFinite(n)) return String(n);
      var a = Math.abs(n);
      if (a !== 0 && (a < 1e-4 || a >= 1e6)) return n.toExponential(6);
      return (Math.round(n * 1e8) / 1e8).toString();
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
  }
})();
