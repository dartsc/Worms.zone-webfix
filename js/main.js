const isMobile = (/Android|webOS|iPhone|iPad|iPod|BlackBerry|BB|PlayBook|IEMobile|Windows Phone|Kindle|Silk|Opera Mini/i.test(navigator.userAgent));

if (typeof SET_ORIENTATION !== "undefined" && SET_ORIENTATION == "LANDSCAPE" && isMobile) {
    document.documentElement.classList.add('is-landscape');
}

if (typeof SET_ORIENTATION !== "undefined" && SET_ORIENTATION == "PORTRAIT" && isMobile) {
    document.documentElement.classList.add('is-portrait');
}

// ------------------------------------------------------------------------------

var WEBGL = {
    isWebGLAvailable: function() {
        try {
            // var canvas = document.createElement('canvas');
            var canvas = document.getElementById('canvas');
            return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
        } catch (e) {
            return false;
        }
    },

    getWebGLErrorMessage: function() {
        return this.getErrorMessage(1);
    }
};

function logError(text, fatal) {
    console.error(text);

    if (typeof gtag === "function") {
        gtag('event', 'exception', {
            'description': text,
            'fatal': fatal // set to true if the error is fatal
        });
    }
}

function loadScript(src) {
    return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.type = 'text/javascript';
        s.src = src;
        s.async = true;
        s.onerror = (err) => {
            reject(err, s);
        };
        s.addEventListener('load', (e) => {
            resolve();
        });
        const head = document.getElementsByTagName('head')[0];
        head.appendChild(s);
    });
  }

// ------------------------------------------------------------------------------

let isLoginSupported = typeof XSOLLA_LOGIN_PROJECT_ID !== 'undefined';
let isPaymentsSupported = isLoginSupported && typeof XSOLLA_PROJECT_ID !== 'undefined';
let sdkInitialized = false;
let runtimeInit = false;
let xl;

async function loadScripts() {
    if (isLoginSupported) {
        try {
            await loadScript('https://login-sdk.xsolla.com/latest/');
    
            xl = new XsollaLogin.Widget({
                projectId: XSOLLA_LOGIN_PROJECT_ID,
                callbackUrl: window.location.href,
                preferredLocale: navigator.language.replace('-','_') || 'en_XX'
            });
        
            xl.mount("xl_auth");
        } catch (e) {
            logError(e, false);
            isLoginSupported = false;
            isPaymentsSupported = false;
        }
    }

    if (isPaymentsSupported) {
        try {
            await loadScript('https://static.xsolla.com/embed/paystation/1.2.8/widget.min.js');
        } catch (e) {
            logError(e, false);
            isPaymentsSupported = false;
        }
    }

    sdkInitialized = true;
}

loadScripts();

function tryToRun() {
    if (runtimeInit === true && sdkInitialized === true) {
        try {
            Module.callMain();
        } catch (error) {
            logError(error, true);
        }
    } else {
        setTimeout(function() {
            tryToRun();
        }, 500);
    }
}

window.onload = function() {
    const spinner = document.querySelector('.js-spinner');

    if (spinner) {
        spinner.remove();
    }

    tryToRun();
};

// ------------------------------------------------------------------------------

// Social Module ----------------------------------------------------------------

//// Share ----------------------------------------------------------------------

const SHARE_TYPE = "null";

const isShareSupported = false;
function shareImpl(title, msg, attachment, selfPtr) { }

const isInviteSupported = false;
function inviteImpl(selfPtr, name, msg, link) { }

const isRequestSupported = false;
function requestImpl(userId, msg, reqKey) { }

function isReviewSupported(selfPtr) {
    const value = false;
    Module.ccall('onReviewSupported', 'null', ['number', 'number'], [selfPtr, value]);
}
function rateAppImpl(selfPtr) { }

const getContextType = () => -1;

//// Service --------------------------------------------------------------------

const SERVICE_TYPE = isLoginSupported ? 'xl' : 'null';
let isLoggedIn = false;
let accessToken = localStorage.getItem('xlAccessToken');

const UserInfo = {
    uid: '',
    name: '',
    photoUrl: ''
};

function setAccessToken(token) {
    localStorage.setItem('xlAccessToken', token);
    accessToken = token;
}

function setIsLoggedIn(isLogged) {
    isLoggedIn = isLogged;
}

const params = new URLSearchParams(document.location.search);
if (params.get('token')) {
    setAccessToken(params.get('token'));
}

async function getUserInfo(selfPtr) {
    try {
        const resp = await fetch(
            `https://login.xsolla.com/api/users/me`,
            {
              method: 'GET',
              headers: {
                Authorization: accessToken
              }
            }
          );
          
          const data = await resp.json();
          
          UserInfo.uid = data.id.replace(/-/g, '');
          UserInfo.name = data.name;
          UserInfo.photoUrl = data.picture;
          setIsLoggedIn(true);
    } catch (error) {
        setIsLoggedIn(false);
        setAccessToken('');
        localStorage.removeItem('xlAccessToken');
        Module.ccall('onNotLogged', 'null', ['number'], [selfPtr]);
    }
}

function openAuthWidget() {
    xl.open();
    document.getElementById('xl_auth').style.display = 'block';
}

async function getLoginStatusImpl(selfPtr) {
    if (!accessToken) {
        Module.ccall('onNotLogged', 'null', ['number'], [selfPtr]);
        return;
    }

    if (!isLoggedIn) {
        await getUserInfo(selfPtr);
    }

    Module.ccall('onStatus', 'null', ['number', 'string', 'string', 'string', 'number'], [selfPtr, UserInfo.uid, UserInfo.name, UserInfo.photoUrl, isLoggedIn]);
}

function loginImpl(selfPtr) {
    if (isLoginSupported) {
        openAuthWidget();
    } else {
        Module.ccall('onNotLoggedIn', 'null', ['number'], [selfPtr]);
    }
}

function logoutImpl(selfPtr) {
    if (params.get('token')) {
        params.delete('token');
        history.replaceState(null, '', window.location.href.split('?')[0]);
    }
    setAccessToken('');
    localStorage.removeItem('xlAccessToken');
    setIsLoggedIn(false);
    UserInfo.uid = '';
    UserInfo.name = '';
    UserInfo.photoUrl = '';
    Module.ccall('onLoggedOut', 'null', ['number'], [selfPtr]);
}

function loadUserPictureImpl(selfPtr) {
    Module.ccall('onPicturePath', 'null', ['number', 'string'], [selfPtr, UserInfo.photoUrl]);
}

// End Social Module ------------------------------------------------------------

// GameCenter Module ------------------------------------------------------------

function submitScore(leaderboardId, score, leaderboardTitle, custom) { }

function requestLeaderboard(leaderboardId, offset, count, globalScope, gameCenter) { }

// End GameCenter Module --------------------------------------------------------

// Advertise Module -------------------------------------------------------------

const adDescription = [
    {
        name: "interstitial",
        isLoading: false,
        isReady: true,
        timeout: 180 // 60 * 3 sec
    },
    {
        name: "rewarded",
        isLoading: false,
        isReady: false,
        counter: 0,
        maxCounter: 6 //  2^6 == 64 sec
    }
]

const requestedAd = {
    name: null,
    isWatched: false
};

const vaipoverlay = document.getElementById('vaipoverlay');


if (typeof aiptag !== 'undefined') {
    aiptag.cmd.player.push(function() {
        console.log("(ADS) Create Player.");
        const ad = adDescription.find(ad => ad.name === "rewarded");
        aiptag.adplayer = new aipPlayer({
            AD_WIDTH: 960,
            AD_HEIGHT: 540,
            AD_DISPLAY: 'fill', // default, fullscreen, center, fill
            TRUSTED: true,
            LOADING_TEXT: 'loading advertisement',
            PREROLL_ELEM: function() {
                var elem = document.getElementById('vaipcontainer');
                if (elem == null) {
                    elem = document.createElement('div');
                    elem.id = 'vaipcontainer';

                    if (vaipoverlay) {
                        vaipoverlay.appendChild(elem);
                    }
                }
                return elem;
            },
            AIP_COMPLETE: function(state) {
                /*
                *******************
                ***** WARNING *****
                *******************
                Please do not remove the PREROLL_ELEM
                from the page, it will be hidden automaticly.
                If you do want to remove it use the AIP_REMOVE callback.
                */
                console.log("(ADS) Preroll Ad Completed: " + state);
                requestedAd.isWatched = (state === 'video-ad-completed');
                aipCompleted();
            },
            AIP_REWARDEDGRANTED: function() {
                // at this point the reward is granted, usually this will be just before
                // or after AIP_REWARDEDCOMPLETE but this is not always the case
                ad.isReady = false;
                requestedAd.isWatched = true;
                console.log("(ADS) Reward Granted");
                aipCompleted();
                cacheRewarded();
            },
            AIP_REWARDEDNOTGRANTED: function(state) {
                // state can be: timeout, empty or closed
                ad.isReady = false;
                requestedAd.isWatched = false;
                console.log("(ADS) Rewarded Ad Completed: " + state);
                aipCompleted();
                cacheRewarded();
            },
            AIP_REMOVE: function() {
                // Here it's save to remove the PREROLL_ELEM from the page if you want.
                // But it's not recommend.
            }
        });

        console.log("(ADS) Precache Rewarded.");
        cacheRewarded();
    });
}

// The code below is to preload an rewarded ad, you can determine when
// you want to show the rewarded ad after the preloading
function cacheRewarded() {
    const ad = adDescription.find(ad => ad.name === "rewarded");
    // check if the adslib is loaded correctly or blocked by adblockers etc.
    if (typeof aiptag.adplayer !== 'undefined') {
        ad.counter = Math.min(++ad.counter, ad.maxCounter);

        // It's important the EventListener rewardedSlotReady is added only once.
        if (aipAPItag.rewardedSlotEventListener !== true) {
            aipAPItag.rewardedSlotEventListener = true;
            console.log("(ADS) Setup Rewarded callback.");

            aiptag.events.addEventListener("rewardedSlotReady", function(e) {
                ad.isLoading = false;
                ad.isReady = (e.detail.isEmpty !== true);
                console.log("(ADS) Rewarded ready to show: " + ad.isReady);

                if (ad.isReady) {
                    ad.counter = 0;
                } else {
                    setTimeout(() => cacheRewarded(), Math.pow(2, ad.maxCounter) * 1000);
                }
            }, false);
        }

        if (ad.isReady === false && ad.isLoading === false) {
            ad.isLoading = true;
            console.log("(ADS) Start Rewarded caching.");

            // set the preload flag to true to use preloading of the rewarded ad
            aiptag.cmd.player.push(function() { aiptag.adplayer.startRewardedAd({preload: true, showLoading: false}); });
        }
    } else {
        console.log("(ADS) Variable aiptag.adplayer undefined.");
    }
}

function aipCompleted() {
    if (requestedAd.name && requestedAd.name === "interstitial") {
        Module.ccall('onInterstitialResult', 'null', ['number'], [requestedAd.isWatched]);
    } else {
        Module.ccall('onVideoResult', 'null', ['number'], [requestedAd.isWatched]);
    }

    if (vaipoverlay) {
        vaipoverlay.hidden = true;
    }
}

function showAds(name) {
    requestedAd.name = name;
    requestedAd.isWatched = false;

    if (vaipoverlay) {
        vaipoverlay.hidden = false;
    }

    // check if the adslib is loaded correctly or blocked by adblockers etc.
    if (typeof aiptag.adplayer !== 'undefined') {
        console.log("(ADS) Show Name: " + name);
        if (name === "rewarded") {
            aiptag.adplayer.showRewardedAd();
            // set the preload flag to true to use preloading of the rewarded ad
            // aiptag.cmd.player.push(function() { aiptag.adplayer.startRewardedAd({preload: true, showLoading: true}); });
        } else {
            const ad = adDescription.find(ad => ad.name === name);
            aiptag.cmd.player.push(function() { aiptag.adplayer.startPreRoll(); });

            ad.isReady = false;
            ad.isLoading = true;
            setTimeout(() => ad.isReady = true, ad.timeout * 1000);
        }
    } else {
        // Adlib didnt load this could be due to an adblocker, timeout etc.
        // Please add your script here that starts the content,
        // this usually is the same script as added in AIP_REWARDEDCOMPLETE.
        console.log("(ADS) Ad Could not be loaded, load your content here");
        aipCompleted();
    }
}

function initializeAdvertise() { }

function interstitialIsReady() {
    if (typeof aiptag === 'undefined') {
        return false;
    }

    const ad = adDescription.find(ad => ad.name === "interstitial");

    if (ad.isReady === false && ad.isLoading === false) {
        ad.isLoading = true;
        setTimeout(() => ad.isReady = true, ad.timeout * 1000);
    }

    console.log('(ADS) Is Interstitial ready: ', ad.isReady);

    return ad.isReady;
}

function showInterstitial() {
    if (typeof aiptag === 'undefined') {
        Module.ccall('onInterstitialResult', 'null', ['number'], [0]);
        return;
    }

    showAds("interstitial");
}

function videoIsReady() {
    if (typeof aiptag === 'undefined') {
        return false;
    }

    const ad = adDescription.find(ad => ad.name === "rewarded");

    console.log('(ADS) Is Rewarded ready: ' + ad.isReady);
    return ad.isReady;
}

function showVideo() {
    if (typeof aiptag === 'undefined') {
        Module.ccall('onVideoResult', 'null', ['number'], [0]);
        return;
    }

    showAds("rewarded");
}

function showBanner(isVisible) { }

// End Advertise Module ---------------------------------------------------------

// InApp Module -----------------------------------------------------------------

const INAPP_NODENAME = '';
const paymentsCatalog = [];
let purchasedItems = new Map();
let isBuyItemPopupOpened = false;

function openPaymentWidget(ptr, itemId, token, isSandbox) {
    const options = {
        access_token: token,
        sandbox: !!isSandbox,
        lightbox: {
            contentMargin: '30px'
        },
        iframeOnly: true
    };
    let isFinishedPayment = false;

    XPayStationWidget.init(options);
    XPayStationWidget.open();

    XPayStationWidget.on("status-done status-troubled close", function (event, data) {
        if (event.type == "status-done") {
            purchasedItems.set(itemId, itemId);
            Module.ccall('onOrderSuccess', 'null', ['number', 'string'], [ptr, itemId]);
            isFinishedPayment = true;
            XPayStationWidget.close();
        }
        if (event.type == "status-troubled") {
            Module.ccall('onOrderFail', 'null', ['number', 'string'], [ptr, itemId]);
            isFinishedPayment = true;
            XPayStationWidget.close();
        }
        if (event.type == "close" && !isFinishedPayment) {
            Module.ccall('onOrderCancel', 'null', ['number', 'string'], [ptr, itemId]);
        }
    });
}

function testProduct(value) {
    if (purchasedItems.has(value)) {
        return true;
    }

    for (let key of purchasedItems.keys()) {
        if (key.includes(value)) {
            return true;
        }
    }

    return false;
}

function updateCatalog(ptr, catalog) {
    for (let i in catalog) {
        const c = catalog[i];
        // console.log('InApp itemId: ' + c.sku + ', ' + c.price.amount + ', ' + c.price.currency + ', ' + c.name + ', ' + c.description);
        const isOwned = testProduct(c.sku);
        const price = c.price.amount + ' ' + c.price.currency;
        Module.ccall('onUpdated', 'null', ['number', 'string', 'string', 'string', 'string', 'string', 'number'], [ptr, c.sku, price, c.price.currency, c.name, c.description, isOwned]);
    }
}

async function getPurchases(ptr) {
    const query = new URLSearchParams({
        limit: '200',
        offset: '0',
        platform: 'xsolla'
    }).toString();

    try {
        const resp = await fetch(
            `https://store.xsolla.com/api/v2/project/${XSOLLA_PROJECT_ID}/user/inventory/items?${query}`,
            {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            }
        );

        const purchases = await resp.json();

        purchases.items.forEach(function(product) {
            purchasedItems.set(product.sku, product);
        });

        updateCatalog(ptr, paymentsCatalog);
    } catch (error) {
        updateCatalog(ptr, paymentsCatalog);
    }
}

async function fetchPaymentsList(offset = 0) {
    const limit = 50;
    const query = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
        locale: navigator.language.slice(0, 2) || "en"
    }).toString();

    const resp = await fetch(
        `https://store.xsolla.com/api/v2/project/${XSOLLA_PROJECT_ID}/items/virtual_items?${query}`,
        {
            method: 'GET'
        }
    );

    const catalog = await resp.json();

    paymentsCatalog.push(...catalog.items);

    if (catalog.has_more) {
        await fetchPaymentsList(limit + offset);
    }
}

async function getPaymentsList(ptr) {
    try {
        await fetchPaymentsList(0);
        purchasedItems = new Map();

        Module.ccall('onReady', 'null', ['number'], [ptr]);
    } catch (error) {
        Module.ccall('onUnsupported', 'null', ['number', 'string'], [ptr, 'unsupported']);
    }
}

async function getPayments(ptr) {
    if (!isPaymentsSupported) {
        Module.ccall('onUnsupported', 'null', ['number', 'string'], [ptr, 'unsupported']);

        return;
    }

    await getPaymentsList(ptr);

    if (accessToken) {
        getPurchases(ptr);
        return;
    }

    if (!isLoggedIn) {
        updateCatalog(ptr, paymentsCatalog);
    }
}

async function buyItem(ptr, itemId, payload, sku, title, description, price) {
    if (!isLoggedIn) {
        openAuthWidget();
        isBuyItemPopupOpened = true;

        xl && xl.on(xl.events.Close, () => {
            if (!isLoggedIn && isBuyItemPopupOpened) {
                isBuyItemPopupOpened = false;
                Module.ccall('onOrderFail', 'null', ['number', 'string'], [ptr, itemId]);
            }
            xl.close();
        });

        return;
    }

    if (!isPaymentsSupported || !accessToken) {
        console.log('(InApps) no accessToken error');
        Module.ccall('onOrderFail', 'null', ['number', 'string'], [ptr, itemId]);
        return;
    }

    const isSandbox = false;
    // const isSandbox = true;

    try {
        const resp = await fetch(
            `https://store.xsolla.com/api/v2/project/${XSOLLA_PROJECT_ID}/payment/item/${itemId}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`
                },
                body: JSON.stringify({
                    sandbox: isSandbox,
                    quantity: 1,
                })
            }
        );

        const data = await resp.json();

        openPaymentWidget(ptr, itemId, data.token, isSandbox);
    } catch (error) {
        console.log('(InApps) error: ' + error);
        Module.ccall('onOrderFail', 'null', ['number', 'string'], [ptr, itemId]);
    }
}

async function consumeItem(ptr, itemId) {
    if (!isPaymentsSupported) {
        return;
    }

    // console.log("consumeItem", itemId, purchasedItems);
    const query = new URLSearchParams({
        platform: 'xsolla'
    }).toString();

    try {
        let isOwned = purchasedItems.has(itemId);

        if (isOwned) {
            const resp = await fetch(
                `https://store.xsolla.com/api/v2/project/${XSOLLA_PROJECT_ID}/user/inventory/item/consume?${query}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${accessToken}`
                    },
                    body: JSON.stringify({
                        sku: itemId,
                        quantity: 1,
                        instance_id: null
                    })
                }
            );

            Module.ccall('onConsumeFinished', 'null', ['number', 'string'], [ptr, itemId]);
            purchasedItems.delete(itemId);
        }
    } catch (e) {
        console.log('InApp consume error: ' + JSON.stringify(e));
    }
}

// End InApp Module -------------------------------------------------------------

// Profile Module ---------------------------------------------------------------

function loadProfile(ptr) {}

function writeProfile(profile) {}

// End Profile Module -----------------------------------------------------------

// ------------------------------------------------------------------------------

var Module = {
    noInitialRun: true,
    noExitRuntime: true,

    preRun: [],
    postRun: [],

    printErr: function(text) {
        if (arguments.length > 1) {
            text = Array.prototype.slice.call(arguments).join(' ');
        }

        logError(text, false);
    },

    onRuntimeInitialized: function() {
        runtimeInit = true;

        window.addEventListener('mousedown', function(evt) {
            window.focus();
            evt.stopPropagation();
            evt.target.style.cursor = 'default';
        }, false);
    },

    canvas: (function() {
        var canvas = document.getElementById('canvas');
        return canvas;
    })(),

    setStatus: function(text) {},

    totalDependencies: 0,
    monitorRunDependencies: function(left) {}
};
