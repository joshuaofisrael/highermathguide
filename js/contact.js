/* Contact form for FormSubmit.
   CONTACT_ENDPOINT is the FormSubmit token. This first version uses the
   publisher address split in two parts so the full mailbox is not one
   literal, and it is not written into the HTML. After the first real
   submission is activated, replace CONTACT_ENDPOINT with the FormSubmit
   random alias and set the form action in contact/index.html to
   https://formsubmit.co/<alias> so the no-JS post does not depend on
   this file. */
(function () {
  "use strict";

  var CONTACT_ENDPOINT = "joshuaofisrael" + "@gmail.com";
  var AJAX_URL = "https://formsubmit.co/ajax/" + CONTACT_ENDPOINT;
  var FORM_URL = "https://formsubmit.co/" + CONTACT_ENDPOINT;
  var MIN_MS = 3000;

  var form = document.getElementById("contact-form");
  if (!form) return;

  form.action = FORM_URL;

  var thanks = document.getElementById("contact-thanks");
  var error = document.getElementById("contact-error");
  var button = form.querySelector('button[type="submit"]');
  var started = Date.now();

  function showThanks() {
    if (!thanks) return;
    thanks.hidden = false;
    if (error) error.hidden = true;
  }

  function showError(message) {
    if (!error) return;
    error.textContent = message;
    error.hidden = false;
  }

  if (/[?&]sent=1(?:&|$)/.test(window.location.search)) showThanks();

  form.addEventListener("submit", function (event) {
    var honey = form.querySelector('[name="_honey"]');
    if (honey && honey.value) {
      event.preventDefault();
      showThanks();
      return;
    }
    if (Date.now() - started < MIN_MS) {
      event.preventDefault();
      showError("Please wait a moment, then send the note.");
      return;
    }
    if (!window.fetch) return;

    event.preventDefault();
    if (button) button.disabled = true;
    if (error) error.hidden = true;

    var payload = {};
    var data = new FormData(form);
    data.forEach(function (value, key) {
      payload[key] = value;
    });

    fetch(AJAX_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(payload)
    })
      .then(function (res) {
        if (!res.ok) throw new Error("send failed");
        return res.json();
      })
      .then(function (data) {
        if (data && String(data.success) === "false") {
          if (button) button.disabled = false;
          showError("The message could not be sent. Please try again in a moment.");
          return;
        }
        form.reset();
        if (button) button.disabled = false;
        showThanks();
        if (window.history && window.history.replaceState) {
          var url = new URL(window.location.href);
          url.searchParams.set("sent", "1");
          window.history.replaceState({}, "", url.pathname + url.search);
        }
      })
      .catch(function () {
        if (button) button.disabled = false;
        form.submit();
      });
  });
})();
