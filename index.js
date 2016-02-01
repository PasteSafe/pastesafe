////
//// PasteSafe web app.
////

var officialBaseLink = "https://chasemoskal.github.io/PasteSafe/";

// Forcing HTTPS in production.
var production = /github\.io/i.test(window.location.href) || /pastesafe\.com/i.test(window.location.href);
if (production && !/https/i.test(window.location.protocol))
    window.location.href = "https:" + window.location.href.substring(window.location.protocol.length);

// Obtaining references to PasteSafe DOM elements.
var root = document.querySelector('[paste-safe]');
var textInput = root.querySelector('.text-input');
var textOutput = root.querySelector('.text-output');
var passwordInput = root.querySelector('.password');
var passwordTooltip = root.querySelector('.passbox .tooltip');
var encryptButton = root.querySelector('.encrypt');
var decryptButton = root.querySelector('.decrypt');
var outputBlocker = root.querySelector('.output-blocker');
var bottomLink = root.querySelector('.bottom-link');

// Start focused on password box.
passwordInput.focus();

var setBottomLink = (hex) => {
    if (hex) {
        bottomLink.href = "#" + hex;
        bottomLink.textContent = officialBaseLink + "#" + hex.substring(0, 8) + "...";
        bottomLink.setAttribute("data-show", "");
    }
    else {
        bottomLink.href = "#";
        bottomLink.textContent = "";
        bottomLink.removeAttribute("data-show");
    }
};
setBottomLink();

var getCryptionMode = () => root.querySelector('input[name="cryption_mode"]:checked').value;

// Handling the switch between 'encrypt' and 'decrypt' cryption mode.
function refreshCryptionMode() {
    var cryptionMode = getCryptionMode();
    if (cryptionMode === 'encrypt') {
        root.setAttribute('data-cryption-mode', 'encrypt');
        decryptButton.parentElement.removeAttribute('data-checked');
        encryptButton.parentElement.setAttribute('data-checked', '');
    }
    else {
        root.setAttribute('data-cryption-mode', 'decrypt');
        encryptButton.parentElement.removeAttribute('data-checked');
        decryptButton.parentElement.setAttribute('data-checked', '');
    }
}
encryptButton.addEventListener('change', refreshCryptionMode);
decryptButton.addEventListener('change', refreshCryptionMode);
refreshCryptionMode();

function setCryptionMode(mode) {
    encryptButton.checked = (mode==='encrypt') ?true :false;
    decryptButton.checked = (mode==='decrypt') ?true :false;
    refreshCryptionMode();
}

// Blocking the output textarea with a message.
// Modes:
//  - off: no output blocker.
//  - plain: subtle blocker with a simple message.
//  - error: angry blocker that indicates something went wrong.
function setOutputBlocker(options) {
    return false;
    var mode = options.mode || "off";
    var list = options.list || [];
    outputBlocker.setAttribute("data-mode", mode);
    outputBlocker.innerHTML = "";
    list.forEach(item => {
        var li = document.createElement('li');
        li.textContent = item;
        outputBlocker.appendChild(li);
    });
}

// As-you-type instant (en|de)cryption.
var instantActionInProgress = false;
function instantAction() {
    if (instantActionInProgress) return;
    instantActionInProgress = true;

    passwordTooltip.removeAttribute("data-show");

    var cryptionMode = getCryptionMode();

    if (!!textInput.value && !!passwordInput.value) {
        if (cryptionMode === 'encrypt') {
            aesBuddy.encrypt(passwordInput.value, textInput.value)
                .then(hex => {
                    textOutput.textContent = hex;
                    setBottomLink(hex);
                    return hex;
                })
                .then(hex => { setOutputBlocker({mode: "off", list: []}); })
                .catch(error => {
                    textOutput.textContent = "";
                    setBottomLink();
                    setOutputBlocker({mode: "error", list: ["encryption error"]});
                })
                .then(()=>{ instantActionInProgress = false; });
        }
        else {
            aesBuddy.decrypt(passwordInput.value, textInput.value)
                .then(text => {
                    textOutput.textContent = text;
                    setBottomLink();
                    return text;
                })
                .then(text => { setOutputBlocker({mode: "off", list: []}) })
                .catch(error => {
                    textOutput.textContent = "";
                    setBottomLink();
                    setOutputBlocker({mode: "error", list: ["invalid"]});
                })
                .then(()=>{ instantActionInProgress = false; });
        }
    }
    else {
        textOutput.textContent = "";
        setBottomLink();
        setOutputBlocker({mode: "plain", list: ["enter some input text and a password above"]});
        instantActionInProgress = false;
    }
}

// Bindings for instant action.
textInput.addEventListener('keyup', instantAction);
passwordInput.addEventListener('keyup', instantAction);
encryptButton.addEventListener('change', instantAction);
decryptButton.addEventListener('change', instantAction);

// Flyout toggle.
var plate = document.querySelector('.plate');
plate.setAttribute("data-flyout-state", window.localStorage.getItem("flyout") || "active");
function toggleHandler(event) {
    var currentState = plate.getAttribute("data-flyout-state");
    var newState = currentState==="active" ?"hidden" :"active";
    plate.setAttribute("data-flyout-state", newState);
    window.localStorage.setItem("flyout", newState);
    if (event) event.preventDefault();
    return false;
}
var toggleButtons = document.querySelectorAll('.flyout-toggle-button');
for (var i=0; i<toggleButtons.length; i++)
    toggleButtons[i].onclick = toggleHandler;

// Initializing with decryption data from URL.
function interpretHash() {
    var hash = /(?:^|#)([0-9a-fA-f]{10,})/i.exec(window.location.hash);
    if (hash) {
        var hex = hash[1];
        textInput.value = hex;
        setCryptionMode('decrypt');
        passwordInput.focus();
        instantAction();
        passwordTooltip.setAttribute("data-show", "");
    }
    window.location.hash = ''; // Removing hash afterwards.
}
window.addEventListener('hashchange', interpretHash);
interpretHash();

// Initial instant action.
instantAction();