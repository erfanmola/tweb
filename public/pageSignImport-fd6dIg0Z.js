const __vite__fileDeps=["./pageIm-Dz55Dpoz.js","./index-CvWBhmNo.js","./index-CPYeyI0a.css","./page-9xzdIDLN.js","./pagePassword-BUHj7bf5.js","./putPreloader-XqhBclwv.js","./buttonIcon-Beq2DGJD.js","./htmlToSpan-Cs_vmNib.js","./wrapEmojiText-C9ZwzJ29.js","./loginPage-CxZlI-GA.js","./pageSignIn-CCvqSK4z.js","./countryInputField-D8kEeBe8.js","./scrollable-COTa0yl_.js","./pageSignQR-99Bv1MS4.js","./textToSvgURL-Cnw_Q8Rw.js"],__vite__mapDeps=i=>i.map(i=>__vite__fileDeps[i]);
import{a as o,A as s,_ as r,S as m}from"./index-CvWBhmNo.js";import{p as h}from"./putPreloader-XqhBclwv.js";import{P as d}from"./page-9xzdIDLN.js";let i;const g=async()=>{const{dcId:e,token:u,tgAddr:n}=i;let a;try{o.managers.apiManager.setBaseDcId(e);const t=await o.managers.apiManager.invokeApi("auth.importWebTokenAuthorization",{api_id:s.id,api_hash:s.hash,web_auth_token:u},{dcId:e,ignoreErrors:!0});t._==="auth.authorization"&&(await o.managers.apiManager.setUser(t.user),a=r(()=>import("./pageIm-Dz55Dpoz.js"),__vite__mapDeps([0,1,2,3]),import.meta.url))}catch(t){switch(t.type){case"SESSION_PASSWORD_NEEDED":{t.handled=!0,a=r(()=>import("./pagePassword-BUHj7bf5.js"),__vite__mapDeps([4,1,2,5,3,6,7,8,9]),import.meta.url);break}default:{console.error("authorization import error:",t);const p=m.authState._;p==="authStateSignIn"?a=r(()=>import("./pageSignIn-CCvqSK4z.js"),__vite__mapDeps([10,1,2,5,3,11,6,8,12,13,14]),import.meta.url):p==="authStateSignQr"&&(a=r(()=>import("./pageSignQR-99Bv1MS4.js").then(_=>_.a),__vite__mapDeps([13,1,2,6,3,14,5]),import.meta.url));break}}}location.hash=n?.trim()?"#?tgaddr="+encodeURIComponent(n):"",a&&a.then(t=>t.default.mount())},l=new d("page-signImport",!0,()=>{h(l.pageEl.firstElementChild,!0),g()},e=>{i=e,o.managers.appStateManager.pushToState("authState",{_:"authStateSignImport",data:i})});export{l as default};
//# sourceMappingURL=pageSignImport-fd6dIg0Z.js.map