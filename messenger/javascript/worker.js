const fVars = JSON.parse(new URL(location).searchParams.get('params'));
var _version = fVars.V;
var BBCODES = fVars.BBCODES;
var THEME = fVars.THEME;
var HOST = fVars.HOST;
var notification_timeout;
var db = new Dexie("vy_ms_store_vars");
db.version(1).stores({
    global_vars: 'id,_var,_value,_timestamp'
});
const cache_assets = 'vy_ms_assets_cache';
const staticAssets = [

    './app.js',
    './themes/'+THEME+'/javascript/core.js?v=' + _version,
    './themes/'+THEME+'/javascript/jquery-3.1.1.min.js?v=' + _version,
    './themes/'+THEME+'/stylesheet/glyph.css?v=' + _version,
    './themes/'+THEME+'/stylesheet/style.css?v=' + _version,
    './themes/'+THEME+'/javascript/vaneayoung/clipboard.min.js?v=' + _version,
    './themes/'+THEME+'/javascript/vaneayoung/easytimer.min.js?v=' + _version,
    './themes/'+THEME+'/javascript/vaneayoung/liveNotifications.js?v=' + _version,
    './themes/'+THEME+'/javascript/vaneayoung/messenger-shortcut.js?v=' + _version,
    './themes/'+THEME+'/javascript/vaneayoung/messenger.js?v=' + _version,
    './themes/'+THEME+'/javascript/vaneayoung/peer.min.js?v=' + _version,
    './themes/'+THEME+'/javascript/vaneayoung/recorder.js?v=' + _version,
    './themes/'+THEME+'/javascript/vaneayoung/socket.io-1.2.0.js?v=' + _version,
    './themes/'+THEME+'/javascript/vaneayoung/soundmanager2-jsmin.js?v=' + _version,
    './themes/'+THEME+'/javascript/vaneayoung/system.js?v=' + _version,
    './themes/'+THEME+'/javascript/vaneayoung/tinysort.min.js?v=' + _version,
    './themes/'+THEME+'/javascript/vaneayoung/webrtc-calls.js?v=' + _version,
    './themes/'+THEME+'/javascript/vaneayoung/confirm-dialog/js/jquery-confirm.min.js?v=' + _version,
    './themes/'+THEME+'/javascript/vaneayoung/confirm-dialog/css/jquery-confirm.min.css?v=' + _version,
    './themes/'+THEME+'/javascript/vaneayoung/emojiarea/dist/emojionearea.min.css?v=' + _version,
    './themes/'+THEME+'/javascript/vaneayoung/emojiarea/dist/emojionearea.min.js?v=' + _version,
    './themes/'+THEME+'/javascript/vaneayoung/emojiarea/dist/joypixels.min.js?v=' + _version,
    './themes/'+THEME+'/javascript/vaneayoung/lightgallery/css/lightgallery.min.css?v=' + _version,
    './themes/'+THEME+'/javascript/vaneayoung/lightgallery/js/lightgallery.min.js?v=' + _version,
    './themes/'+THEME+'/javascript/vaneayoung/nanoScroll/css/nanoscroller.css?v=' + _version,
    './themes/'+THEME+'/javascript/vaneayoung/nanoScroll/javascripts/overthrow.min.js?v=' + _version,
    './themes/'+THEME+'/javascript/vaneayoung/nanoScroll/javascripts/jquery.nanoscroller.min.js?v=' + _version,
	'./themes/'+THEME+'/javascript/vaneayoung/timeago.min.js?v=' + _version
];
 
self.addEventListener('install', async event => {
    const cache = await caches.open(cache_assets);
    await cache.addAll(staticAssets);
});


// Listen to fetch requests

self.addEventListener('fetch', function(event) {
    // We will cache all POST requests, but in the real world, you will probably filter for
    // specific URLs like if(... || event.request.url.href.match(...))
    if (event.request.method === "POST" && !event.request.url.includes('checklogin.php')) {

        // Init the cache. We use Dexie here to simplify the code. You can use any other
        // way to access IndexedDB of course.
        var cdb = new Dexie("post_cache");
        cdb.version(1).stores({
            post_cache: 'key,response,timestamp'
        })

        event.respondWith(
            // First try to fetch the request from the server
            fetch(event.request.clone())
            .then(function(response) {
                // If it works, put the response into IndexedDB
                cachePut(event.request.clone(), response.clone(), cdb.post_cache);
                return response;
            })
            .catch(function() {
                // If it does not work, return the cached response. If the cache does not
                // contain a response for our request, it will give us a 503-response
                return cacheMatch(event.request, cdb.post_cache);
            })
        );
    }
});


/**
 * Serializes a Request into a plain JS object.
 * 
 * @param request
 * @returns Promise
 */
function serializeRequest(request) {
    return request.clone().text().then(function(body) {
        return Promise.resolve(md5(body + '_' + request.referrer));
    });
}

/**
 * Serializes a Response into a plain JS object
 * 
 * @param response
 * @returns Promise
 */
function serializeResponse(response) {
    var serialized = {
        headers: serializeHeaders(response.headers),
        status: response.status,
        statusText: response.statusText
    };

    return response.clone().text().then(function(body) {
        serialized.body = body;
        return Promise.resolve(serialized);
    });
}

/**
 * Serializes headers into a plain JS object
 * 
 * @param headers
 * @returns object
 */
function serializeHeaders(headers) {
    var serialized = {};
    // `for(... of ...)` is ES6 notation but current browsers supporting SW, support this
    // notation as well and this is the only way of retrieving all the headers.
    for (var entry of headers.entries()) {
        serialized[entry[0]] = entry[1];
    }
    return serialized;
}

/**
 * Creates a Response from it's serialized version
 * 
 * @param data
 * @returns Promise
 */
function deserializeResponse(data) {
    return Promise.resolve(new Response(data.body, data));
}

/**
 * Saves the response for the given request eventually overriding the previous version
 * 
 * @param data
 * @returns Promise
 */
async function cachePut(request, response, store) {
    var key, data;
    await getPostId(request)
        .then(function(id) {
            key = id;
            return serializeResponse(response.clone());
        }).then(function(serializedResponse) {
            data = serializedResponse;
            var entry = {
                key: key,
                response: data,
                timestamp: Date.now()
            };
            store
                .add(entry)
                .catch(function(error) {
                    store.update(entry.key, entry);
                });
        });
}

/**
 * Returns the cached response for the given request or an empty 503-response  for a cache miss.
 * 
 * @param request
 * @return Promise
 */
async function cacheMatch(request, store) {
    return await getPostId(request)
        .then(function(id) {
            return store.get(id);
        }).then(function(data) {
            if (data) {
                return deserializeResponse(data.response);
            } else {
                return new Response('', {
                    status: 503,
                    statusText: 'Service Unavailable'
                });
            }
        });
}

/**
 * Returns a string identifier for our POST request.
 * 
 * @param request
 * @return string
 */
async function getPostId(request) {
    /*return request.clone().text().then(function(body) {
      return Promise.resolve(body);
    });*/
    return serializeRequest(request.clone());
    //return JSON.stringify(serializeRequest(request.clone()));
}

/* START MD5 */
function md5cycle(x, k) {
    var a = x[0],
        b = x[1],
        c = x[2],
        d = x[3];

    a = ff(a, b, c, d, k[0], 7, -680876936);
    d = ff(d, a, b, c, k[1], 12, -389564586);
    c = ff(c, d, a, b, k[2], 17, 606105819);
    b = ff(b, c, d, a, k[3], 22, -1044525330);
    a = ff(a, b, c, d, k[4], 7, -176418897);
    d = ff(d, a, b, c, k[5], 12, 1200080426);
    c = ff(c, d, a, b, k[6], 17, -1473231341);
    b = ff(b, c, d, a, k[7], 22, -45705983);
    a = ff(a, b, c, d, k[8], 7, 1770035416);
    d = ff(d, a, b, c, k[9], 12, -1958414417);
    c = ff(c, d, a, b, k[10], 17, -42063);
    b = ff(b, c, d, a, k[11], 22, -1990404162);
    a = ff(a, b, c, d, k[12], 7, 1804603682);
    d = ff(d, a, b, c, k[13], 12, -40341101);
    c = ff(c, d, a, b, k[14], 17, -1502002290);
    b = ff(b, c, d, a, k[15], 22, 1236535329);

    a = gg(a, b, c, d, k[1], 5, -165796510);
    d = gg(d, a, b, c, k[6], 9, -1069501632);
    c = gg(c, d, a, b, k[11], 14, 643717713);
    b = gg(b, c, d, a, k[0], 20, -373897302);
    a = gg(a, b, c, d, k[5], 5, -701558691);
    d = gg(d, a, b, c, k[10], 9, 38016083);
    c = gg(c, d, a, b, k[15], 14, -660478335);
    b = gg(b, c, d, a, k[4], 20, -405537848);
    a = gg(a, b, c, d, k[9], 5, 568446438);
    d = gg(d, a, b, c, k[14], 9, -1019803690);
    c = gg(c, d, a, b, k[3], 14, -187363961);
    b = gg(b, c, d, a, k[8], 20, 1163531501);
    a = gg(a, b, c, d, k[13], 5, -1444681467);
    d = gg(d, a, b, c, k[2], 9, -51403784);
    c = gg(c, d, a, b, k[7], 14, 1735328473);
    b = gg(b, c, d, a, k[12], 20, -1926607734);

    a = hh(a, b, c, d, k[5], 4, -378558);
    d = hh(d, a, b, c, k[8], 11, -2022574463);
    c = hh(c, d, a, b, k[11], 16, 1839030562);
    b = hh(b, c, d, a, k[14], 23, -35309556);
    a = hh(a, b, c, d, k[1], 4, -1530992060);
    d = hh(d, a, b, c, k[4], 11, 1272893353);
    c = hh(c, d, a, b, k[7], 16, -155497632);
    b = hh(b, c, d, a, k[10], 23, -1094730640);
    a = hh(a, b, c, d, k[13], 4, 681279174);
    d = hh(d, a, b, c, k[0], 11, -358537222);
    c = hh(c, d, a, b, k[3], 16, -722521979);
    b = hh(b, c, d, a, k[6], 23, 76029189);
    a = hh(a, b, c, d, k[9], 4, -640364487);
    d = hh(d, a, b, c, k[12], 11, -421815835);
    c = hh(c, d, a, b, k[15], 16, 530742520);
    b = hh(b, c, d, a, k[2], 23, -995338651);

    a = ii(a, b, c, d, k[0], 6, -198630844);
    d = ii(d, a, b, c, k[7], 10, 1126891415);
    c = ii(c, d, a, b, k[14], 15, -1416354905);
    b = ii(b, c, d, a, k[5], 21, -57434055);
    a = ii(a, b, c, d, k[12], 6, 1700485571);
    d = ii(d, a, b, c, k[3], 10, -1894986606);
    c = ii(c, d, a, b, k[10], 15, -1051523);
    b = ii(b, c, d, a, k[1], 21, -2054922799);
    a = ii(a, b, c, d, k[8], 6, 1873313359);
    d = ii(d, a, b, c, k[15], 10, -30611744);
    c = ii(c, d, a, b, k[6], 15, -1560198380);
    b = ii(b, c, d, a, k[13], 21, 1309151649);
    a = ii(a, b, c, d, k[4], 6, -145523070);
    d = ii(d, a, b, c, k[11], 10, -1120210379);
    c = ii(c, d, a, b, k[2], 15, 718787259);
    b = ii(b, c, d, a, k[9], 21, -343485551);

    x[0] = add32(a, x[0]);
    x[1] = add32(b, x[1]);
    x[2] = add32(c, x[2]);
    x[3] = add32(d, x[3]);

}

function cmn(q, a, b, x, s, t) {
    a = add32(add32(a, q), add32(x, t));
    return add32((a << s) | (a >>> (32 - s)), b);
}

function ff(a, b, c, d, x, s, t) {
    return cmn((b & c) | ((~b) & d), a, b, x, s, t);
}

function gg(a, b, c, d, x, s, t) {
    return cmn((b & d) | (c & (~d)), a, b, x, s, t);
}

function hh(a, b, c, d, x, s, t) {
    return cmn(b ^ c ^ d, a, b, x, s, t);
}

function ii(a, b, c, d, x, s, t) {
    return cmn(c ^ (b | (~d)), a, b, x, s, t);
}

function md51(s) {
    txt = '';
    var n = s.length,
        state = [1732584193, -271733879, -1732584194, 271733878],
        i;
    for (i = 64; i <= s.length; i += 64) {
        md5cycle(state, md5blk(s.substring(i - 64, i)));
    }
    s = s.substring(i - 64);
    var tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (i = 0; i < s.length; i++)
        tail[i >> 2] |= s.charCodeAt(i) << ((i % 4) << 3);
    tail[i >> 2] |= 0x80 << ((i % 4) << 3);
    if (i > 55) {
        md5cycle(state, tail);
        for (i = 0; i < 16; i++) tail[i] = 0;
    }
    tail[14] = n * 8;
    md5cycle(state, tail);
    return state;
}

/* there needs to be support for Unicode here,
 * unless we pretend that we can redefine the MD-5
 * algorithm for multi-byte characters (perhaps
 * by adding every four 16-bit characters and
 * shortening the sum to 32 bits). Otherwise
 * I suggest performing MD-5 as if every character
 * was two bytes--e.g., 0040 0025 = @%--but then
 * how will an ordinary MD-5 sum be matched?
 * There is no way to standardize text to something
 * like UTF-8 before transformation; speed cost is
 * utterly prohibitive. The JavaScript standard
 * itself needs to look at this: it should start
 * providing access to strings as preformed UTF-8
 * 8-bit unsigned value arrays.
 */
function md5blk(s) {
    /* I figured global was faster.   */
    var md5blks = [],
        i; /* Andy King said do it this way. */
    for (i = 0; i < 64; i += 4) {
        md5blks[i >> 2] = s.charCodeAt(i) +
            (s.charCodeAt(i + 1) << 8) +
            (s.charCodeAt(i + 2) << 16) +
            (s.charCodeAt(i + 3) << 24);
    }
    return md5blks;
}

var hex_chr = '0123456789abcdef'.split('');

function rhex(n) {
    var s = '',
        j = 0;
    for (; j < 4; j++)
        s += hex_chr[(n >> (j * 8 + 4)) & 0x0F] +
        hex_chr[(n >> (j * 8)) & 0x0F];
    return s;
}

function hex(x) {
    for (var i = 0; i < x.length; i++)
        x[i] = rhex(x[i]);
    return x.join('');
}

function md5(s) {
    return hex(md51(s));
}

/* this function is much faster,
so if possible we use it. Some IEs
are the only ones I know of that
need the idiotic second function,
generated by an if clause.  */

function add32(a, b) {
    return (a + b) & 0xFFFFFFFF;
}

if (md5('hello') != '5d41402abc4b2a76b9719d911017c592') {
    function add32(x, y) {
        var lsw = (x & 0xFFFF) + (y & 0xFFFF),
            msw = (x >> 16) + (y >> 16) + (lsw >> 16);
        return (msw << 16) | (lsw & 0xFFFF);
    }
}

/* END MD5 */


self.addEventListener('message', async function(e) {
    for (i in e.data)
        await db.global_vars.put({
            id: i,
            _var: i,
            _value: e.data[i],
            _timestamp: Date.now()
        });
});


function isValidImageURL(url) {
    if (typeof url !== 'string') return false;
    return !!url.match(/\w+\.(jpg|jpeg|gif|png|tiff|bmp)$/gi);
}

function _json_valid(_json) {

    if (/^[\],:{}\s]*$/.test(_json.replace(/\\["\\\/bfnrtu]/g, '@').replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']').replace(/(?:^|:|,)(?:\s*\[)+/g, '')))
        return true;
    else
        return false;


}
async function settings() {
	 
	let V_EMOJIS = await getVarIndb('V_EMOJIS'), LANG = await getVarIndb('LANG'), _emojiVersion = await getVarIndb('_emojiVersion'), _emojiDefaultSize = await getVarIndb('_emojiDefaultSize'),
	ic_url = V_EMOJIS+_emojiVersion+'/png/unicode/32/';
 
	return {
		'notif_timeout':999999,
		'notif_vibrate': [200], // example: [200,500,200]
		'notif_icon': 'auto', // or put your custom image url, auto using the recipient or group or page avatar
		'notif_renotify': true, 
		'notif_silent': false,
		'reaction_default_btn': 'seen', // default reaction button [seen or like]
		'buttons':{
			 
			'btn_accept_invitation': {'title':LANG.BTN_JOIN,'action':'join_group'},
			'btn_decline_invitation': {'title':LANG.BTN_DECLINE,'action':'decline_group_invitation'},
			'btn_seen': {'title':LANG.BTN_SEEN,'action':'seen','icon':ic_url+'1f441.png'},
			'btn_like': {'title':LANG.BTN_LIKE,'action':'like','icon':ic_url+'1f44d.png'},
			'btn_reply': {'title':LANG.BTN_REPLY,'action':'reply','icon':ic_url+'270d.png'},
			'btn_mute': {'title':LANG.BTN_MUTE+' %s','action':'mute','icon':ic_url+'1f507.png'},
			'btn_hide': {'title':LANG.BTN_HIDE,'action':'hide','icon':''},
			'btn_change_nicknames': {'title':LANG.BTN_CHANGE_NICKNAMES,'action':'change_nicknames','icon':''},
			'btn_change_color': {'title':LANG.BTN_CHANGE_COLOR,'action':'change_color','icon':''}
			
		}
		   
		
		};

 
	
}
async function containsBBCODE(str) {

    let BBCODES = await getVarIndb('BBCODES');


    if (!_json_valid(BBCODES)) return false;

    BBCODES = JSON.parse(BBCODES);

    let is_bbcode = !1;

    for (var i = 0; i < BBCODES.length; i++) {

        if (str.includes(BBCODES[i]))
            is_bbcode = !0;

    }

    return is_bbcode;

}
async function vy_ms_livemedia(str, min, ot) {

    let r = {
        'error': null,
        'msg': str
    };
    let post_data = {};
    let HOST = await getVarIndb('HOST');

    post_data['cmd'] = 'bbcode';
    post_data['json_format'] = 'yes';
    post_data['string'] = str;
    post_data['dmurl'] = 'yes';

    if (min)
        post_data['min'] = 'yes';

    if (ot)
        post_data['ot'] = 'yes';


    await fetch(HOST + '/messenger.php', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: gparams(post_data)
        })
        .then(
            async function(response) {
                if (response.status !== 200) {
                    r['error'] = '[bb] Looks like there was a problem. Status Code: ' + response.status;
                    return;
                }

                // Examine the text in the response
                await response.json().then(function(data) {
                    r['msg'] = data;
                });
            }
        )
        .catch(function(err) {
            r['error'] = '[bb] Fetch Error :-S ' + err;
        });

    if (r['error']) console.log(r.error);

    return r;
}
async function generateUrl(data) {
    let msg = data.msg_data;
    let user = data.user_data;
    let HOST = await getVarIndb('HOST');
    let url = HOST + '/messenger';
	let user_id = user.hasOwnProperty('id') ? user.id : user.i;

    if (msg.group_id > 0)
        url += '/g/' + msg.group_id;
    else if (msg.page_id > 0)
        url += '/' + user_id + '/' + msg.page_id;
    else
        url += '/' + user_id;

    return url;
}
 
async function _showGroupNotification(e, data) {

	let st = await settings(),
	     group_details = data.group_data.Group_data,
		 avatar = group_details.group_avatar,
		 group_name = group_details.group_name,
		 group_owner_id = group_details.group_owner,
		 group_id = _num(data.group_data.Group_clean_id),
		 tag = 'vy_ms__push_group_' + group_id,
		 body = 'unknown message',
		 HOST = await getVarIndb('HOST'),
		 url = HOST + '/messenger/g/' + group_id;
	
	// ignore errors
	data['msg_data'] = {'group_id':group_id};
	data['user_data'] = {'id':0};
  
 
	let btn2 = {
            action: st.buttons.btn_mute.action
            ,title: st.buttons.btn_mute.title.replace('%s', 'group')
			,icon: st.buttons.btn_mute.icon
        },btn1 = {
            action: st.buttons.btn_hide.action
            ,title: st.buttons.btn_hide.title
        };
	let actions = [btn1,btn2];	
		
	switch(data.group_data.categ){
		
		case 'nickname-updated':
			body = data.group_data.nickname_removed ? `${data.group_data.User.fn} ${LANG.REMOVED_HIS_NICKNAME}.` : `${data.group_data.User.fn} ${LANG.UPDATED_NICKNAME}: ${data.group_data.Nickname}`;
		break;
		
		case 'group-cleaned':
			body = `${data.group_data.User.fn} ${LANG.CLEANED_THE_GROUP}`;
		break;
		case 'you-re-removed-from-group':
			body = `${data.group_data.User.fn} ${LANG.REMOVED_YOU_FROM_GROUP}.`;
			actions = [btn1];
		break;
		case 'invited-you-in-a-group':
			body = `${data.group_data.User.fn} ${LANG.SENT_YOU_GROUP_INVITATION} ${group_name}`;
			btn1 = {action: st.buttons.btn_accept_invitation.action, title:st.buttons.btn_accept_invitation.title};
			btn2 = {action: st.buttons.btn_decline_invitation.action, title:st.buttons.btn_decline_invitation.title};
			actions = [btn1,btn2];	
		break;
		case 'group-color-changed':
			body = `${data.group_data.User.fn} ${LANG.UPDATED_CHAT_COLOR}.`;
		break;
		case 'react':
		let reaction_emoji = reaction_emojis(data.group_data.Data.notif.reaction);
		body = `${data.group_data.Data.user.fn} ${LANG.REACTED} ${reaction_emoji} ${LANG.TO_YOUR_MESSAGE}.`;
		break;
	} 
 



    let n_obj = {
        body: body,
        icon: st.notif_icon == 'auto' ? avatar : st.notif_icon,
        actions: actions,
        data: {
            url: url,
            data: data
        },
        vibrate: st.notif_vibrate,
        timeout: st.notif_timeout,
        tag: tag,
        badge: avatar,
        dir: 'auto',
        lang: 'Unicode',
        renotify: st.notif_renotify,
        silent: st.notif_silent,
        timestamp: Date.now()
    };
 

    closeNotif(tag);

    return send_Push(e, data, n_obj, group_name);

}
async function _showNotification(e, msg, data) {
 
	let st = await settings();
    let avatar = data.user_data.group > 0 ? data.user_data.group_avatar : (data.user_data.hasOwnProperty('avatar') ? data.user_data.avatar : data.user_data.p);
    let url = await generateUrl(data);
    let tag = data.user_data.group > 0 ? 'vy_ms__push_group_'+data.user_data.group : 'vy_ms__push_uid_' + ( data.user_data.page ? data.user_data.id+'_'+data.user_data.page : data.user_data.id);
	let df_reaction_btn = st.reaction_default_btn == 'seen' ? st.buttons.btn_seen : st.buttons.btn_like;
    let title = data.user_data.group > 0 ? data.user_data.group_name : (data.user_data.hasOwnProperty('fullname') ? data.user_data.fullname : data.user_data.fn);
    let body = data.user_data.group > 0 ? data.user_data.fullname+': '+msg.msg : msg.msg;
	let LANG = await getVarIndb('LANG');
	
	if(data.msg_data.reply != null){
		
		if(data.user_data.group > 0){
			body = data.user_data.fullname+' '+LANG.REPLIED+': '+msg.msg;
		} else {
			body = LANG.REPLIED+': '+msg.msg;
		}
		
	}
	
	let notif_actions = null, default_data = null,
		btn_hide = {
            action: st.buttons.btn_hide.action
            ,title: st.buttons.btn_hide.title
        },
		btn_change_color = {
            action: st.buttons.btn_change_color.action
            ,title: st.buttons.btn_change_color.title
        },
		btn_change_nicknames = {
            action: st.buttons.btn_change_nicknames.action
            ,title: st.buttons.btn_change_nicknames.title
        };
		
	if(data.user_data.page > 0)
			title = data.user_data.page_name.match(/\((.*?)\)/g) && data.user_data.page_admin == 'yes' ? data.user_data.page_name.match(/\((.*?)\)/g).map(b=>b.replace(/\(|(.*?)\)/g,"$1")) : data.user_data.fullname + ' ('+data.user_data.page_name+')';
 
	let btn1 = {
            action: df_reaction_btn.action
            ,title: df_reaction_btn.title
			,icon: df_reaction_btn.icon
        }; 
	let btn2 = {
            action: st.buttons.btn_mute.action
            ,title: st.buttons.btn_mute.title.replace('%s',( data.user_data.group > 0 ? 'group' : data.user_data.fullname))
			//,icon: st.buttons.btn_mute.icon
        }; 
		
	if(	data.user_data.group > 0 || data.user_data.page > 0)
		btn1 = {
            action: st.buttons.btn_reply.action,
            title: st.buttons.btn_reply.title,
			icon: st.buttons.btn_reply.icon
        };
		
	if(	data.user_data.page > 0 )
		btn2 = btn_hide;
				
		
	if(data.notif_data.hasOwnProperty('categ')){
	 
		switch(data.notif_data.categ){
			
			case 'nickname_added':
				notif_actions = [btn_change_nicknames,btn_hide];
				data['additional_action'] = 'change_nicknames';
				if( trim(data.notif_data.nickname1) && trim(data.notif_data.nickname2) )
					body = `${data.user_data.fn} ${LANG.YOUR_NICKNAME} ${data.notif_data.nickname1} ${LANG.HIS_NICKNAME} ${data.notif_data.nickname2}.`;
				else if( trim(data.notif_data.nickname1) && !trim(data.notif_data.nickname2) )
					body = `${data.user_data.fn} ${LANG.YOUR_NICKNAME} ${data.notif_data.nickname1}.`;
				else if( !trim(data.notif_data.nickname1) && trim(data.notif_data.nickname2) )
					body = `${data.user_data.fn} ${LANG.UPDATED_NICKNAME} ${data.notif_data.nickname2}.`;
			break;
			case 'nickname_cleared':
				body = `${LANG.CLEARED_NICKNAMES}.`;
				notif_actions = [btn_hide];
				data['additional_action'] = 'change_nicknames';
			break;
			case 'color_changed':
				body = `${LANG.UPDATED_CHAT_COLOR}.`;
				notif_actions = [btn_change_color,btn_hide];
				data['additional_action'] = 'change_color';
			break;
			case 'react':
				let reaction_emoji = reaction_emojis(data.notif_data.reaction);
				body = `${data.user_data.fn} ${LANG.REACTED} ${reaction_emoji} ${LANG.TO_YOUR_MESSAGE}.`;
				notif_actions = [btn_hide];
			break;
		} 
		
		

	 
	}
	default_data = {url: url,data: data};
	let actions = notif_actions ? notif_actions : [btn1,btn2];
    let n_obj = {
        body: body,
        icon: st.notif_icon == 'auto' ? avatar : st.notif_icon,
        actions: actions,
        data: default_data,
        vibrate: st.notif_vibrate,
        timeout: st.notif_timeout,
        tag: tag,
        badge: avatar,
        dir: 'auto',
        lang: 'Unicode',
        renotify: st.notif_renotify,
        silent: st.notif_silent, 
        timestamp: Date.now()
    };

    if (msg.direct_url)
        n_obj['image'] = msg.direct_url;

    closeNotif(tag);

    return send_Push(e, data, n_obj, title);

}
		function reaction_emojis(r){
			
			let reaction_emoji = '❤️‍';
			
				switch(r){
					
					case 'like':
						reaction_emoji = '❤️‍';
					break;
					case 'haha':
						reaction_emoji = '😂';
					break;
					case 'wow':
						reaction_emoji = '😮';
					break;
					case 'sad':
						reaction_emoji = '😭';
					break;
					case 'angry':
						reaction_emoji = '😡';
					break;
				}
				
			return reaction_emoji;
			
		}
function trim(str) {
        return str.replace(/^\s+|\s+$/g,"");
}
function closeNotif(tag) {

    self.registration.getNotifications()
        .then(notifications => {
            notifications.forEach(function(n) {

                if (n.tag == tag)
                    n.close();

            });
        });

}

async function send_Push(e, data, notif_obj, title) {
  
    let st = await settings();

	if(notification_timeout) clearTimeout(notification_timeout);
 
    clients.matchAll({  
        includeUncontrolled: true,
        type: 'window'
    }).then(windowClients => {
        var clientIsVisible = false;

        // Check if there is already a window/tab open with the target URL
        for (var i = 0; i < windowClients.length; i++) {
            var client = windowClients[i];

            if (client.visibilityState === "visible")
                clientIsVisible = true;


        }
        if (!clientIsVisible) {
            self.registration.showNotification(decodeURIComponent(title), notif_obj).then(function(){
				notification_timeout = setTimeout(function(){closeNotif(notif_obj.tag)},st.notif_timeout);
			});
        } 
    });
 
} 
self.addEventListener('push', async function(e) {
 
    const data = e.data.json();
 
 
	if(Object.keys(data.group_data).length && data.group_data.hasOwnProperty('Group_clean_id') && _num(data.group_data.Group_clean_id) > 0)
		return _showGroupNotification(e, data);

 
    let img,
        msg = data.msg_data,
        l_msg = msg.hasOwnProperty('push_text') ? msg.push_text : '',
        ndata = {
            'msg': l_msg,
            'direct_url': ''
        };
		
 

    if (msg.bg == 'no' || await containsBBCODE(l_msg)) {

        await vy_ms_livemedia(l_msg, 1, 1).then(function(t) {
            ndata.msg = t.msg.str;
            ndata.direct_url = t.msg.direct_url;
        });

    }

    _showNotification(e, ndata, data);
});

self.addEventListener('notificationclick', function(e) {
    let url = e.notification.data.url;
    let data = e.notification.data.data;
    e.notification.close(); // Android needs explicit close.

    e.waitUntil(
        clients.matchAll({
            includeUncontrolled: true
        }).then(w => {
            let msg = {

                'action': e.action,
                'url': url,
                'data': data

            };

            switch (e.action) {
                case 'seen':
                    sendMessage('👁️', data);
                    break;
                case 'like':
                    sendMessage('👍', data);
                    break;
                case 'mute':
                    msg['action'] = 'mute';
                    muteContact(data, msg, w);
				break;
				case 'hide':
					e.notification.close();
				break;	
				
				case 'decline_group_invitation':
					declineGroupInvitation(data,msg,w);
				break;
				
				case 'join_group':
					acceptGroupInvitation(data,msg,w);
				break;

				case 'change_color':
				case 'change_nicknames':
				case 'reply':
				case '':
                default:
                    msg['action'] = 'openContact';
							
                    for (var i = 0; i < w.length; i++) {
                        var client = w[i];
                        if ('focus' in client) {

                            if (client.url !== url)
                                client.postMessage(msg);
                            else {
                                msg['action'] = 'scroll';
                                client.postMessage(msg);
                            }
							
							if(e.action == 'change_nicknames')
								msg['additional_action'] = 'open_nicknames';
							if(e.action == 'change_color')
								msg['additional_action'] = 'open_colors';

                            return client.focus();
                        }
                    }
                    // If not, then open the target URL in a new window/tab.
                    if (clients.openWindow) {
                        return clients.openWindow(url);
                    }
                    break;
            }


        })
    );

}, false);
async function acceptGroupInvitation(data,msg,w){
	
  	let _U = await getVarIndb('_U'), send_data = {'cmd':'accept-group-invitation','id':escape(_U.i),'group':escape(_num(data.group_data.Group_clean_id))};
    fetch(HOST + '/messenger.php', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: gparams(send_data)
        })
        .then(
            async function(response) {
                if (response.status !== 200) {
                    console.log('[accept-group-invitation] Looks like there was a problem. Status Code: ' + response.status);
                    return;
                } else {

                // Examine the text in the response
                await response.json().then(function(d) {
				 
					if(d.success == '1') {
					
	
                    msg['group_data'] = JSON.stringify({
														'Room_id': socketId('GG'+_num(data.group_data.Group_clean_id)),
														'Userid': socketId(_U.i),
														'Userid_clean': _U.i,
														'Group_id_clean': _num(data.group_data.Group_clean_id)
													});
													
                    for (var i = 0; i < w.length; i++)
                        if ('focus' in w[i])
                            w[i].postMessage(msg);
							
						
					} else console.log('[ERROR accept-group-invitation] ' + response.msg);

                });
				
				}
			
        })
        .catch(function(err) {
            console.error('[Join Group Fetch Error]' + err);
        });
	
	
}
async function declineGroupInvitation(data,msg,w){
	
  	let _U = await getVarIndb('_U'), send_data = {'cmd':'ignore-group-invitation','id':escape(_U.i),'group':escape(_num(data.group_data.Group_clean_id))};
    fetch(HOST + '/messenger.php', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: gparams(send_data)
        })
        .then(
            async function(response) {
                if (response.status !== 200) {
                    console.log('[accept-group-invitation] Looks like there was a problem. Status Code: ' + response.status);
                    return;
                } else {

                // Examine the text in the response
                await response.json().then(function(d) {
				 
					if(d.success == '1') {
					
                    msg['group_data'] = JSON.stringify({
														'Room_id': socketId('GG'+_num(data.group_data.Group_clean_id)),
														'Userid': socketId(_U.i),
														'Userid_clean': _U.i,
														'Group_id_clean': _num(data.group_data.Group_clean_id),
														'own_exit':1
													});
													
                    for (var i = 0; i < w.length; i++)
                        if ('focus' in w[i])
                            w[i].postMessage(msg);
							
							
					} else console.log('[ERROR accept-group-invitation] ' + response.msg);

                });
				
				}
			
        })
        .catch(function(err) {
            console.error('[Join Group Fetch Error]' + err);
        });
	
}
function randomId() {

    return Date.now() + Math.floor(Math.random() * 99);
}
async function getVarIndb(v) {
    return await db.global_vars.where('id').equals(v).toArray(function(i) {
        return i[i.length - 1]._value;
    })
}
async function socketId(user_id) {
    let _U = await getVarIndb('_U'),V_WS_ADDR = await getVarIndb('V_WS_ADDR'),id = user_id ? user_id : _U.i;
    return md5(V_WS_ADDR + '_' + id);
}

function gparams(o) {
    return Object.keys(o).map((k) => encodeURIComponent(k) + '=' + encodeURIComponent(o[k])).join('&');
}
async function sendMessage(txt, data) {

    let msg_data = data.msg_data,
        user_data = data.user_data,
        recipient = user_data.id,
        post_data = {},
        send_msg_data = {},
        HOST = await getVarIndb('HOST'),
        VY_SERV_URL = await getVarIndb('VY_SERV_URL'),
        _U = await getVarIndb('_U'),
        hash = recipient + '__' + randomId(),
        send_data = {
            msg: {},
            user: {}
        },
        msg_rand_id = randomId(),
        d = new Date(),
        time_minutes = d.getMinutes() >= 10 ? d.getMinutes() : '0' + d.getMinutes();

    send_data['msg']['id'] = msg_rand_id; // unsettled msg id
    send_data['msg']['msgid'] = msg_rand_id; // unsettled msg id
    send_data['msg']['text'] = txt;
    send_data['msg']['min_text'] = txt;
    send_data['msg']['page_id'] = msg_data.page_id ? msg_data.page_id : 0;
    send_data['msg']['group_id'] = msg_data.group_id ? msg_data.group_id : 0;
    send_data['msg']['rd'] = 'no';
    send_data['msg']['read'] = 'no';
    send_data['msg']['seen'] = '0';
    send_data['msg']['bg'] = 'no';
    send_data['msg']['time'] = d.getHours() + ':' + time_minutes;
    send_data['msg']['timestamp'] = (new Date().getTime());
    send_data['msg']['curr_date'] = (new Date().getDate());
    send_data['msg']['count'] = 1;
    send_data['msg']['recipient'] = recipient;

    // user
    send_data['user']['id'] = _U.i;
    send_data['user']['socketid'] = socketId(_U.i);
    send_data['user']['fullname'] = _U.fn;
    send_data['user']['avatar'] = _U.p;
    send_data['user']['online_ago'] = 1;
    send_data['user']['online'] = 1;


    setTimeout(async function() {
        if (msg_data.group_id > 0)
            await fetch(VY_SERV_URL + '/pushmessage', {
                method: 'POST',
                body: JSON.stringify({
                    'msg_data': {
                        'Group_id': await socketId('GG' + msg_data.group_id),
                        'From': await socketId(_U.i),
                        'Data': send_data,
                        'Hash': hash
                    },
                    'event': 'vy_ms__group_message'
                }),
                headers: {
                    'Content-Type': 'application/json',
                }
            });
        else
            await fetch(VY_SERV_URL + '/pushmessage', {
                method: 'POST',
                body: JSON.stringify({
                    'msg_data': {
                        'Userid': await socketId(recipient),
                        'From': await socketId(_U.i),
                        'Data': send_data,
                        'Hash': hash
                    },
                    'event': 'vy_new_message'
                }),
                headers: {
                    'Content-Type': 'application/json',
                }
            });
    }, 10);

    send_msg_data['id'] = msg_rand_id;
    send_msg_data['cmd'] = "sendMessage";
    send_msg_data['bg'] = 'no';
    send_msg_data['text'] = txt;
    send_msg_data['view_as'] = "json";
    send_msg_data['userid'] = recipient;

    if (msg_data.page_id)
        send_msg_data['page'] = escape(msg_data.page_id);

    if (msg_data.group_id > 0)
        send_msg_data['group'] = escape(msg_data.group_id);


    fetch(HOST + '/messenger.php', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: gparams(send_msg_data)
        })
        .then(
            async function(response) {
                if (response.status !== 200) {
                    console.log('[seen] Looks like there was a problem. Status Code: ' + response.status);
                    return;
                }

                // Examine the text in the response
                await response.json().then(function(data) {
                    console.log('Seen sent', data);
                });
            }
        )
        .catch(function(err) {
            console.error('Seen Fetch Error :-S ' + err);
        });


}
async function muteContact(data, msg, w) {

    let _U = await getVarIndb('_U'),
        VY_SERV_URL = await getVarIndb('VY_SERV_URL'),
        msg_data = data.msg_data,
        user_data = data.user_data,
        recipient = user_data.id,
        send_data = {
            'cmd': 'mute-contact',
            'recipient': escape(recipient),
            'interval': '99'
        }; // mute forever
 
    if (msg_data.group_id > 0)
        send_data['group'] = escape(msg_data.group_id);

    fetch(HOST + '/messenger.php', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: gparams(send_data)
        })
        .then(
            async function(response) {
                if (response.status !== 200) {
                    console.log('[mute] Looks like there was a problem. Status Code: ' + response.status);
                    return;
                }

                // Examine the text in the response
                await response.json().then(function(data) {
               
                    msg['mute_data'] = data.new_arr;
                    for (var i = 0; i < w.length; i++)
                        if ('focus' in w[i])
                            w[i].postMessage(msg);

 

                    // send data to mongo
                    setTimeout(async function() {

                        await fetch(VY_SERV_URL + '/mute', {
                            method: 'POST',
                            body: JSON.stringify({
                                'user_id': await socketId(_U.i),
                                'user_clean_id': _U.i,
                                'recipient_clean_id': msg_data.group_id ? msg_data.group_id : recipient,
                                'recipient_id':  await socketId(_U.i),//msg_data.group_id ? await socketId('GG' + msg_data.group_id) : await socketId(recipient),
                                'group_id': msg_data.group_id ? await socketId('GG' + msg_data.group_id) : 0,
                                'group_clean_id': parseInt(msg_data.group_id),
                                'value': '99',
                                'cron': null,
								'timezone': await getTimezone()
                            }),
                            headers: {
                                'Content-Type': 'application/json',
                            }
                        });
 
                    }, 50);

                });
            }
        )
        .catch(function(err) {
            console.error('[Muted Fetch Error]' + err);
        });

}
async function getTimezone(){
	return await getVarIndb('vy_ms_timezone');
}
function getLocalTimezone(){
	return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
function _num(str) { 
 
	if(/[a-zA-Z]/g.test(str))
		str = str.match(/\d/g).join('');
	 
    return str;
}