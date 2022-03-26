
if(typeof V_EMOJIS != 'undefined'){ 
	const emojis_default_url = V_EMOJIS.split('/assets');
	V_EMOJIS = V_EMOJIS.replace(emojis_default_url[0], VBASIC_URL);
}
$(document).ready(function(){
	
var checkLogin = function(){
	
	if(!$('.messenger-window').length) return;
	 
	
	$.post( V_HOST+"/checklogin.php", function( data ) {  
		if(data == 0)
			window.location.reload(true);
		
	});
	
	
}
	
	setInterval(checkLogin,2500);
	
	//switch account button
	$(document).off('click.switchAccountToLogin').on('click.switchAccountToLogin','#switchAccountToLogin',function(e){
		e.preventDefault();
		
		$('#pwalreadyloggedin').hide();
		$('#loginFormSwitch').removeClass('__none').fadeIn();
 
		
	});
	
});
if(typeof createCookie != 'function'){
function createCookie(name, value, days) {
    if(!days) days = 100;
    if(days) {
        var date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        var expires = "; expires=" + date.toGMTString()
    } else var expires = "";
    document.cookie = name + "=" + value + expires + "; path=/"
}
}
if(typeof readCookie != 'function'){
function readCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for(var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while(c.charAt(0) == ' ') c = c.substring(1, c.length);
        if(c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length)
    }
    return null
}
}
function simulateTakeLogin(e,el){
	e.preventDefault();
	$(el).html('<div class="dot-flashing"></div>');
	createCookie('vy_pwa_log',1,365);
	setTimeout(function(){
		window.location.reload();
	},100);
}
function takelogin(e){
 
	e.preventDefault();
	e.stopPropagation();
	let _form = $('#login_form'),
		login = _form.find('#login').val();
		pass = _form.find('#pass').val();
 
	ajaxLoading();
	$.post( V_HOST+"/takelogin.php",{"login":escape(login), "pass":pass}, function( data ) {  
			
			var d = validateJson(data);
			
			if(d.success == 1){
				createCookie('pwa_login',1);
				$('#login_success_msg').html(d.msg);
				return window.location.reload(true);
				
			} else {
				$('#login_error_msg').html(d.msg);
				
			}
			removeAjaxLoad();
		});
		
		
		
}
function logout(){

let redir = function(t){

setTimeout(function(){
	removeAjaxLoad();
	window.location = '/logout';
},t? t:3000);

};	
	
ajaxLoading();	
navigator.serviceWorker.getRegistrations().then(function(registrations) {
 for(let registration of registrations) {
  registration.unregister();
  redir(500);
} });


redir();
	
}
function isInArray(value, array) {
  return array.indexOf(value) > -1;
}

if(typeof validateJson != 'function') {
function validateJson(str, no_err) {
    try {  
        var json = JSON.parse(str);

        if(typeof json.hasOwnProperty('status'))
            if(json.status === 'require_login')
                window.location.reload();


        return json;
    } catch (e) {
  
        return false;
    }
}
}
if(typeof ajaxLoading != 'function') {
function ajaxLoading() {  

    //var markup = ga('<div class="global_ajax_loader"></div>');
    var b = $('body');
    var markup = '<div class="globalAjaxLoader">\
			<div>        \
			<div class="preloader-spin">\
            <div class="preloader-spin__petal"></div>\
            <div class="preloader-spin__petal"></div>\
            <div class="preloader-spin__petal"></div>\
            <div class="preloader-spin__petal"></div>\
            <div class="preloader-spin__petal"></div>\
            <div class="preloader-spin__petal"></div>\
            <div class="preloader-spin__petal"></div>\
            <div class="preloader-spin__petal"></div>\
            <div class="preloader-spin__petal"></div>\
            <div class="preloader-spin__petal"></div>\
            <div class="preloader-spin__petal"></div>\
            <div class="preloader-spin__petal"></div>\
			</div></div>';

    if(!b.find('.globalAjaxLoader').length)
        b.prepend(markup);
}
}
if(typeof removeAjaxLoad != 'function') {
function removeAjaxLoad() {
   $('body')
        .find('.globalAjaxLoader')
        .remove();
}
}

function configurePushNotifications(){
const MAXAGE = 10; // seconds until recheck
const HASH = Math.floor(Date.now() / (MAXAGE * 1000)); // or a hash of lib.js
const URL = `/pushsw.js?hash=${HASH}`;
Push.config({
    serviceWorker: './pushsw.js', // Sets a custom service worker script
    fallback: function(payload) {
        // Code that executes on browsers with no notification support
        // "payload" is an object containing the 
        // title, body, tag, and icon of the notification 
    }
});
	
}
 
async function pushnotif(msg,user,count){
	console.log(user);
	console.log(msg);
	let url = V_HOST+ '/messenger';	
	let l_msg = msg.text.replace(/&amp;/g, '&');
	let last_ps_id = localStorage.getItem('vy_ms_last_ps_tag');
	
	if(last_ps_id > 0){ console.log('remove');
		Push.close('push_'+last_ps_id);
	}
		
 
		if (msg.bg == 'no' || messenger.containsBBCODE(l_msg)) {

			await messenger.liveMedia(l_msg,1,1).then(async function(t) {  
				l_msg = t;

			});

		}  
	
	if(msg.group_id > 0)
		url += '/g/'+msg.group_id;
	else if(msg.page_id > 0)
		url += '/'+user.id+'/'+msg.page_id;
	else
		url += '/'+user.id;

    Push.create(user.fullname, {
        body: l_msg, 
        icon: user.avatar,
        timeout: 6000, 
		tag: 'push_'+user.id,
		link: url,
		actions: [{action: "open_url", title: "Mark as read"}, {action: "mute", title: "Mute "+user.fullname}],
		
          vibrate: [300],
           
			
			
			badge: user.avatar,
			dir: 'auto',
			
			image:false,
			lang:'Unicode',
			renotify:false,
			silent:false,
			timestamp: Date.now(),
			data: {url: url},
 
		
        onClick: function () { alert('ops');
            window.focus();
            this.close();
        }
    });
	
	localStorage.setItem('vy_ms_last_ps_tag', user.id);

}





 