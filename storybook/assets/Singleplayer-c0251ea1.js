import{a as g,j as l,F as ee}from"./jsx-runtime-37f7df21.js";import{R as H,r as y}from"./index-f1f2c4b1.js";import{c as W,B as S}from"./Button-171a86dd.js";import{f as te}from"./index.esm-b23235d8.js";import{I as ie}from"./Input-38b084ae.js";import{T as ne}from"./Tabs-928a87e0.js";import{M as re}from"./MessageFormattedString-24d5abea.js";import"./client-6473ed4a.js";import"./errorBoundary-d5a5b903.js";const le=""+new URL("isles-73361aa2.png",import.meta.url).href;/**
 * filesize
 *
 * @copyright 2023 Jason Mulligan <jason.mulligan@avoidwork.com>
 * @license BSD-3-Clause
 * @version 10.0.12
 */const oe="array",se="bit",J="bits",de="byte",X="bytes",T="",ae="exponent",ce="function",K="iec",ue="Invalid number",fe="Invalid rounding method",j="jedec",me="object",Q=".",pe="round",_e="s",ge="kbit",he="kB",ye=" ",we="string",ve="0",$={symbol:{iec:{bits:["bit","Kibit","Mibit","Gibit","Tibit","Pibit","Eibit","Zibit","Yibit"],bytes:["B","KiB","MiB","GiB","TiB","PiB","EiB","ZiB","YiB"]},jedec:{bits:["bit","Kbit","Mbit","Gbit","Tbit","Pbit","Ebit","Zbit","Ybit"],bytes:["B","KB","MB","GB","TB","PB","EB","ZB","YB"]}},fullform:{iec:["","kibi","mebi","gibi","tebi","pebi","exbi","zebi","yobi"],jedec:["","kilo","mega","giga","tera","peta","exa","zetta","yotta"]}};function be(e,{bits:t=!1,pad:s=!1,base:i=-1,round:a=2,locale:f=T,localeOptions:c={},separator:d=T,spacer:R=ye,symbols:k={},standard:u=T,output:E=we,fullform:V=!1,fullforms:m=[],exponent:C=-1,roundingMethod:M=pe,precision:w=0}={}){let n=C,v=Number(e),r=[],p=0,q=T;i===-1&&u.length===0?(i=10,u=j):i===-1&&u.length>0?(u=u===K?K:j,i=u===K?2:10):(i=i===2?2:10,u=i===10||u===j?j:K);const N=i===10?1e3:1024,A=V===!0,x=v<0,I=Math[M];if(typeof e!="bigint"&&isNaN(e))throw new TypeError(ue);if(typeof I!==ce)throw new TypeError(fe);if(x&&(v=-v),(n===-1||isNaN(n))&&(n=Math.floor(Math.log(v)/Math.log(N)),n<0&&(n=0)),n>8&&(w>0&&(w+=8-n),n=8),E===ae)return n;if(v===0)r[0]=0,q=r[1]=$.symbol[u][t?J:X][n];else{p=v/(i===2?Math.pow(2,n*10):Math.pow(1e3,n)),t&&(p=p*8,p>=N&&n<8&&(p=p/N,n++));const B=Math.pow(10,n>0?a:0);r[0]=I(p*B)/B,r[0]===N&&n<8&&C===-1&&(r[0]=1,n++),q=r[1]=i===10&&n===1?t?ge:he:$.symbol[u][t?J:X][n]}if(x&&(r[0]=-r[0]),w>0&&(r[0]=r[0].toPrecision(w)),r[1]=k[r[1]]||r[1],f===!0?r[0]=r[0].toLocaleString():f.length>0?r[0]=r[0].toLocaleString(f,c):d.length>0&&(r[0]=r[0].toString().replace(Q,d)),s&&Number.isInteger(r[0])===!1&&a>0){const B=d||Q,h=r[0].toString().split(B),O=h[1]||T,P=O.length,z=a-P;r[0]=`${h[0]}${B}${O.padEnd(P+z,ve)}`}return A&&(r[1]=m[n]?m[n]:$.fullform[u][n]+(t?se:de)+(r[0]===1?T:_e)),E===oe?r:E===me?{value:r[0],symbol:r[1],exponent:n,unit:q}:r.join(R)}function G(e,t){var s,i;if(e===t)return!0;if(e&&t&&(s=e.constructor)===t.constructor){if(s===Date)return e.getTime()===t.getTime();if(s===RegExp)return e.toString()===t.toString();if(s===Array&&(i=e.length)===t.length){for(;i--&&G(e[i],t[i]););return i===-1}if(s===Object){if(Object.keys(e).length!==Object.keys(t).length)return!1;for(i in e)if(!(i in t)||!G(e[i],t[i]))return!1;return!0}}return e!==e&&t!==t}function Se(e){const t=H.useRef([]);return G(e,t.current)||(t.current=e),t.current}function Ee(e,t){return H.useMemo(e,Se(t))}function Ne(e,t,s,i){const a=y.useRef(s);a.current=s;const f=Ee(()=>i,[i]);y.useEffect(()=>{if(!e)return;const c=d=>a.current.call(e,d);return e.addEventListener(t,c,f),()=>{e.removeEventListener(t,c,f)}},[e,t,f])}const Re="_root_1ck2l_1",ke="_content_1ck2l_7",Ce="_content_loading_1ck2l_20",Be="_world_root_1ck2l_24",Me="_world_title_1ck2l_31",Te="_world_title_right_1ck2l_36",Ve="_world_info_1ck2l_40",qe="_world_info_formatted_1ck2l_48",xe="_world_info_description_line_1ck2l_52",Ie="_world_image_1ck2l_56",Oe="_image_missing_1ck2l_60",De="_world_focused_1ck2l_63",je="_title_1ck2l_67",_={root:Re,content:ke,content_loading:Ce,world_root:Be,world_title:Me,world_title_right:Te,world_info:Ve,world_info_formatted:qe,world_info_description_line:xe,world_image:Ie,image_missing:Oe,world_focused:De,title:je};var Ae=typeof window<"u",Pe=function(e,t){t===void 0&&(t=!1);var s=y.useState(Ae?function(){return window.matchMedia(e).matches}:t),i=s[0],a=s[1];return y.useEffect(function(){var f=!0,c=window.matchMedia(e),d=function(){f&&a(!!c.matches)};return c.addListener(d),a(c.matches),function(){f=!1,c.removeListener(d)}},[e]),i};const Le=Pe,Fe="@media (max-width: 440px)",Ye=()=>Le(Fe.replace("@media ","")),Ke=({name:e,isFocused:t,title:s,lastPlayed:i,size:a,detail:f="",onFocus:c,onInteraction:d,iconSrc:R,formattedTextOverride:k,worldNameRight:u})=>{const E=y.useMemo(()=>{if(!i)return"";const m=new Intl.RelativeTimeFormat("en",{numeric:"auto"}),C=Date.now()-i,M=Math.floor(C/1e3/60),w=Math.floor(M/60),n=Math.floor(w/24);return n>0?m.format(-n,"day"):w>0?m.format(-w,"hour"):m.format(-M,"minute")},[i]),V=y.useMemo(()=>a?be(a):"",[a]);return g("div",{className:W(_.world_root,t?_.world_focused:void 0),tabIndex:0,onFocus:()=>c==null?void 0:c(e),onKeyDown:m=>{(m.code==="Enter"||m.code==="Space")&&(m.preventDefault(),d==null||d(m.code==="Enter"?"enter":"space"))},onDoubleClick:()=>d==null?void 0:d("enter"),children:[l("img",{className:`${_.world_image} ${R?"":_.image_missing}`,src:R??le,alt:"world preview"}),g("div",{className:_.world_info,children:[g("div",{className:_.world_title,children:[l("div",{children:s}),l("div",{className:_.world_title_right,children:u})]}),k?l("div",{className:_.world_info_formatted,children:l(re,{message:k})}):g(ee,{children:[g("div",{className:_.world_info_description_line,children:[E," ",f.slice(-30)]}),l("div",{className:_.world_info_description_line,children:V})]})]})]})},He=({worldData:e,onGeneralAction:t,onWorldAction:s,firstRowChildrenOverride:i,serversLayout:a,searchRowChildrenOverride:f,activeProvider:c,setActiveProvider:d,providerActions:R,providers:k={},disabledProviders:u,error:E,isReadonly:V,warning:m,warningAction:C,warningActionLabel:M,hidden:w,onRowSelect:n,defaultSelectedRow:v,listStyle:r,setListHovered:p,secondRowStyles:q,lockedEditing:N})=>{var U;const A=y.useRef(),x=y.useRef(null);Ne(window,"keydown",o=>{if((o.code==="ArrowDown"||o.code==="ArrowUp")&&o.ctrlKey){o.preventDefault();const b=o.code==="ArrowDown"?1:-1,L=te(A.current),F=L.indexOf(document.activeElement);if(F===-1)return;const D=L[F+b];D==null||D.focus()}});const[I,B]=y.useState(""),[h,O]=y.useState(v?((U=e==null?void 0:e[v])==null?void 0:U.name)??"":"");y.useEffect(()=>{O("")},[c]);const P=(o,b)=>{n==null||n(o,b),O(o)},z=Ye();return g("div",{ref:A,hidden:w,children:[l("div",{className:"dirt-bg"}),g("div",{className:W("fullscreen",_.root),children:[l("span",{className:W("screen-title",_.title),children:a?"Join Java Servers":"Select Saved World"}),f||l("div",{style:{display:"flex",flexDirection:"column"},children:l(ie,{autoFocus:!0,value:I,onChange:({target:{value:o}})=>B(o)})}),g("div",{className:W(_.content,!e&&_.content_loading),children:[l(ne,{tabs:Object.keys(k),disabledTabs:u,activeTab:c??"",labels:k,onTabChange:o=>{d==null||d(o)},fullSize:!0}),g("div",{style:{marginTop:3,...r},onMouseEnter:()=>p==null?void 0:p(!0),onMouseLeave:()=>p==null?void 0:p(!1),children:[R&&g("div",{style:{display:"flex",alignItems:"center"},children:[l("span",{style:{fontSize:9,marginRight:3},children:"Actions: "})," ",Object.entries(R).map(([o,b])=>typeof b=="function"?l(S,{onClick:b,style:{width:100},children:o},o):l(y.Fragment,{children:b},o))]}),e?e.filter(o=>o.title.toLowerCase().includes(I.toLowerCase())).map(({name:o,size:b,detail:L,...F},D)=>y.createElement(Ke,{...F,size:b,name:o,onFocus:Y=>P(Y,D),isFocused:h===o,key:o,onInteraction:Y=>{var Z;Y==="enter"?s("load",o):Y==="space"&&((Z=x.current)==null||Z.focus())},detail:L})):l("div",{style:{fontSize:10,color:E?"red":"lightgray"},children:E||"Loading (check #dev console if loading too long)..."}),m&&g("div",{style:{fontSize:8,color:"#ffa500ba",marginTop:5,textAlign:"center"},children:[m," ",C&&l("a",{onClick:C,children:M})]})]})]}),g("div",{style:{display:"flex",flexDirection:"column",minWidth:400,paddingBottom:3,alignItems:"center"},children:[i||g("div",{children:[l(S,{rootRef:x,disabled:!h,onClick:()=>s("load",h),children:"Load World"}),l(S,{onClick:()=>t("create"),disabled:V,children:"Create New World"})]}),g("div",{style:{...q,...z?{display:"grid",gridTemplateColumns:"1fr 1fr"}:{}},children:[a?l(S,{style:{width:100},disabled:!h||N,onClick:()=>s("edit",h),children:"Edit"}):l(S,{style:{width:100},disabled:!h,onClick:()=>s("export",h),children:"Export"}),l(S,{style:{width:100},disabled:!h||N,onClick:()=>s("delete",h),children:"Delete"}),a?l(S,{style:{width:100},onClick:()=>t("create"),disabled:N,children:"Add"}):l(S,{style:{width:100},onClick:()=>s("edit",h),disabled:!0,children:"Edit"}),l(S,{style:{width:100},onClick:()=>t("cancel"),children:"Cancel"})]})]})]})]})};try{Singleplayer.displayName="Singleplayer",Singleplayer.__docgenInfo={description:"",displayName:"Singleplayer",props:{worldData:{defaultValue:null,description:"",name:"worldData",required:!0,type:{name:"WorldProps[] | null"}},serversLayout:{defaultValue:null,description:"",name:"serversLayout",required:!1,type:{name:"boolean"}},firstRowChildrenOverride:{defaultValue:null,description:"",name:"firstRowChildrenOverride",required:!1,type:{name:"ReactNode"}},searchRowChildrenOverride:{defaultValue:null,description:"",name:"searchRowChildrenOverride",required:!1,type:{name:"ReactNode"}},providers:{defaultValue:null,description:"",name:"providers",required:!1,type:{name:"Record<string, string>"}},activeProvider:{defaultValue:null,description:"",name:"activeProvider",required:!1,type:{name:"string"}},setActiveProvider:{defaultValue:null,description:"",name:"setActiveProvider",required:!1,type:{name:"((provider: string) => void)"}},providerActions:{defaultValue:null,description:"",name:"providerActions",required:!1,type:{name:"Record<string, Element | (() => void)>"}},disabledProviders:{defaultValue:null,description:"",name:"disabledProviders",required:!1,type:{name:"string[]"}},isReadonly:{defaultValue:null,description:"",name:"isReadonly",required:!1,type:{name:"boolean"}},error:{defaultValue:null,description:"",name:"error",required:!1,type:{name:"string"}},warning:{defaultValue:null,description:"",name:"warning",required:!1,type:{name:"string"}},warningAction:{defaultValue:null,description:"",name:"warningAction",required:!1,type:{name:"(() => void)"}},warningActionLabel:{defaultValue:null,description:"",name:"warningActionLabel",required:!1,type:{name:"string"}},hidden:{defaultValue:null,description:"",name:"hidden",required:!1,type:{name:"boolean"}},onWorldAction:{defaultValue:null,description:"",name:"onWorldAction",required:!0,type:{name:'(action: "load" | "export" | "delete" | "edit", worldName: string) => void'}},onGeneralAction:{defaultValue:null,description:"",name:"onGeneralAction",required:!0,type:{name:'(action: "cancel" | "create") => void'}},onRowSelect:{defaultValue:null,description:"",name:"onRowSelect",required:!1,type:{name:"((name: string, index: number) => void)"}},defaultSelectedRow:{defaultValue:null,description:"",name:"defaultSelectedRow",required:!1,type:{name:"number"}},listStyle:{defaultValue:null,description:"",name:"listStyle",required:!1,type:{name:"CSSProperties"}},setListHovered:{defaultValue:null,description:"",name:"setListHovered",required:!1,type:{name:"((hovered: boolean) => void)"}},secondRowStyles:{defaultValue:null,description:"",name:"secondRowStyles",required:!1,type:{name:"CSSProperties"}},lockedEditing:{defaultValue:null,description:"",name:"lockedEditing",required:!1,type:{name:"boolean"}}}}}catch{}export{He as S,Ye as u};
//# sourceMappingURL=Singleplayer-c0251ea1.js.map
