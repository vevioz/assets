dwld_btn_onclick=function(){var path='https://addons.vevioz.com/?id='+encodeURIComponent(getYT(window.location));window.open(path,'_blank');};getYT=function(url){var regExp=/^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#\&\?]*).*/;var match=String(url).match(regExp);return(match&&match[7].length==11)?match[7]:false;};getSpan=function(text,className){var _tn=document.createTextNode(text);var span=document.createElement("span");span.className=className;span.appendChild(_tn);return span;};var myAppInterface={init:function(){this.insertGlobalCSS();},addGlobalStyle:function(doc,css){if(document.querySelector('.easy-youtube-mp3-css'))return;var head=doc.getElementsByTagName('head')[0];if(!head){return;}
var style=doc.createElement('style');style.id='easy-youtube-mp3-css';style.type='text/css';if(style.styleSheet){style.styleSheet.cssText=css;}else{style.appendChild(document.createTextNode(css));}
head.appendChild(style);},insertGlobalCSS:function(){var css=function(){}.toString().replace("/*start",'').replace("end*/",'').slice(14,-1);this.addGlobalStyle(document,css);},};createButton=function(){var obj=document.querySelector('#sponsor-button');if(obj!==null){var btnRow=document.getElementById('downloadyoutubemp3');if(btnRow===null){myAppInterface.init();var downloadyoutubemp3=document.createElement("div");downloadyoutubemp3.id="downloadyoutubemp3";downloadyoutubemp3.className="style-scope ytd-watch";var dwld_btn=document.createElement("div");dwld_btn.className="style-scope dwld_btn";dwld_btn.appendChild(getSpan("DOWNLOAD"));dwld_btn.onclick=dwld_btn_onclick;obj.parentNode.insertBefore(downloadyoutubemp3,obj);downloadyoutubemp3.appendChild(dwld_btn);}}};var intervalCheck=setInterval(function(){createButton();},250);