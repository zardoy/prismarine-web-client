import{a as u,j as o}from"./jsx-runtime-37f7df21.js";import{r as i}from"./index-f1f2c4b1.js";import{B as f}from"./Button-171a86dd.js";import{M as h}from"./MessageFormattedString-24d5abea.js";import"./SharedHudVars-63c800bd.js";import"./PixelartIcon-62975882.js";import"./MessageFormatted-ac3715c5.js";import"./simpleUtils-f26d34af.js";import"./vanilla-66a0fdf5.js";import"./chatUtils-3faa5944.js";const y=""+new URL("book-40c62e66.webp",import.meta.url).href,ce=""+new URL("book-half-ae92d0dc.webp",import.meta.url).href,z=""+new URL("notebook-c7720cf7.webp",import.meta.url).href,le="data:image/webp;base64,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",de="_bookWrapper_5qq38_1",ge="_bookContainer_5qq38_15",me="_bookImages_5qq38_25",Ae="_outSide_5qq38_29",ue="_titleIcon_5qq38_40",xe="_titleContent_5qq38_51",pe="_insideIcon_5qq38_79",fe="_insideHalfIcon_5qq38_83",he="_inside_5qq38_79",qe="_uneditable_5qq38_104",Te="_page_5qq38_108",Ce="_messageFormattedString_5qq38_117",He="_textArea_5qq38_131",ke="_blink_5qq38_1",_e="_controlPrev_5qq38_160",De="_controlNext_5qq38_160",Be="_actions_5qq38_198",Ee="_pageAnimation_5qq38_295",Pe="_titleAnimation_5qq38_299",be="_titleContentAnimation_5qq38_304",Re="_insideAnimation_5qq38_309",Se="_pageTextAnimation_5qq38_313",ve="_pageSecondTextAnimation_5qq38_317",Qe="_hidden_5qq38_321",Oe="_titleAnimationReverse_5qq38_421",we="_titleContentAnimationReverse_5qq38_426",Je="_insideAnimationReverse_5qq38_431",Ue="_pageAnimationReverse_5qq38_435",Ye="_pageTextAnimationReverse_5qq38_439",Ie="_pageSecondTextAnimationReverse_5qq38_443",Ne="_pageButtonAnimationReverse_5qq38_447",Le="_text_5qq38_131",n={bookWrapper:de,bookContainer:ge,bookImages:me,outSide:Ae,titleIcon:ue,titleContent:xe,insideIcon:pe,insideHalfIcon:fe,inside:he,uneditable:qe,page:Te,messageFormattedString:Ce,textArea:He,blink:ke,controlPrev:_e,controlNext:De,actions:Be,pageAnimation:Ee,titleAnimation:Pe,titleContentAnimation:be,insideAnimation:Re,pageTextAnimation:Se,pageSecondTextAnimation:ve,hidden:Qe,titleAnimationReverse:Oe,titleContentAnimationReverse:we,insideAnimationReverse:Je,pageAnimationReverse:Ue,pageTextAnimationReverse:Ye,pageSecondTextAnimationReverse:Ie,pageButtonAnimationReverse:Ne,text:Le},v=({textPages:m,editable:d,onSign:Q,onEdit:O,onClose:w,author:V})=>{const[s,x]=i.useState(m),[g,q]=i.useState(0),[r,K]=i.useState(window.innerWidth<972),[X,$]=i.useState(window.innerWidth<972?z:y),[T,J]=i.useState(0),[k,U]=i.useState(0),[C,Y]=i.useState(0),[c,P]=i.useState(!1),A=i.useRef([]),b=i.useRef(null),_=i.useCallback(()=>{const e=window.innerWidth<972;K(e),$(e?z:y)},[]);i.useEffect(()=>(_(),window.addEventListener("resize",_),()=>window.removeEventListener("resize",_)),[_]),i.useEffect(()=>{const e=g*(r?1:2);A.current[e]&&A.current[e].focus()},[g,r]),i.useEffect(()=>{c&&setTimeout(()=>{b.current.focus()},300)},[c]);const I=e=>{q(t=>Math.min(Math.max(t+e,0),Math.ceil(s.length/(r?1:2))-1))},ee=(e,t)=>{x(l=>{const a=[...l];return a[e]=t,a})},te=(e,t)=>{var D,B;const l=e.target.value;ee(t,l);const a=t+1;l.length>=e.target.maxLength?(a<s.length||x(p=>[...p,""]),q(Math.floor(a/(r?1:2))),(D=A.current[a])==null||D.focus()):l===""&&t>0&&e.nativeEvent.inputType==="deleteContentBackward"&&(q(Math.floor((t-1)/(r?1:2))),(B=A.current[t-1])==null||B.focus())};i.useEffect(()=>{var t;const e=g*(r?1:2);(t=A.current[e])==null||t.focus()},[g,r]);const ne=(e,t)=>{const l=e.clipboardData.getData("text"),a=[...s],S=a[t],D=e.currentTarget.selectionStart||0,B=e.currentTarget.selectionEnd||0,p=S.slice(0,D)+l+S.slice(B);if(a[t]=p,x(a),p.length>e.currentTarget.maxLength){const j=p.slice(e.currentTarget.maxLength);a[t]=p.slice(0,e.currentTarget.maxLength),x(a);const E=t+1;E<s.length?oe(j,E):(x(re=>[...re,j]),q(Math.floor(E/(r?1:2))),N(E))}},oe=(e,t)=>{const l=[...s];l[t]=e,x(l),N(t)},N=e=>{setTimeout(()=>{var t;(t=A.current[e])==null||t.focus()},0)},R=i.useCallback(()=>{var e;if(d&&c){const t=((e=b.current)==null?void 0:e.value)||"";Q(s,t)}P(!0),U(1),J(1),setTimeout(()=>{Y(1)},150)},[s,Q,d,c]),ie=i.useCallback(()=>{P(!1),O(s)},[s,O]),se=i.useCallback(()=>{c?(P(!1),Y(2),setTimeout(()=>{J(2),setTimeout(()=>{U(2)},150)},150)):w()},[c,w]),ae=e=>t=>{A.current[e]=t},L=(e,t)=>{switch(e){case 1:return`${t} ${n.pageAnimation}`;case 2:return`${t} ${n.pageAnimationReverse}`;default:return t}},M=e=>o("div",{className:n.page,children:d?o("textarea",{onContextMenu:t=>{t.stopPropagation()},ref:ae(e),value:s[e],onChange:t=>te(t,e),onPaste:t=>ne(t,e),className:L(k,n.textArea),maxLength:500}):o("div",{className:L(k,""),children:o(h,{message:s[e],fallbackColor:"black",className:n.messageFormattedString})})},e);return u("div",{className:n.bookWrapper,children:[u("div",{className:n.bookContainer,children:[o("img",{src:X,className:`${n.insideIcon} ${T===1?n.insideAnimation:C===2?n.insideAnimationReverse:""}`,alt:"inside Icon"}),o("img",{src:ce,className:`${n.insideHalfIcon} ${k===1?n.pageAnimation:k===2?n.pageAnimationReverse:""}`,alt:"inside Page Icon"}),o("img",{src:le,className:`${n.titleIcon} ${C===1?n.titleAnimation:C===2?n.titleAnimationReverse:""}`,alt:"Title Icon"}),u("div",{className:`${n.inside}`,children:[M(g*(r?1:2)),!r&&g*2+1<s.length&&M(g*2+1),o(f,{className:`${n.controlPrev} ${T===1?n.hidden:T===2?n.pageButtonAnimationReverse:""}`,onClick:()=>I(-1),disabled:g===0,children:" "}),o(f,{className:`${n.controlNext} ${T===1?n.hidden:T===2?n.pageButtonAnimationReverse:""}`,onClick:()=>I(1),disabled:(g+1)*(r?1:2)>=s.length,children:" "})]}),o("div",{className:`${n.outSide} ${C===1?n.titleContentAnimation:C===2?n.titleContentAnimationReverse:""}`,children:d?u("div",{className:`${n.titleContent}`,children:[o(h,{message:"Enter Book Title: "}),u("form",{onSubmit:e=>{e.preventDefault(),R()},children:[o("input",{ref:b,className:""}),o("button",{type:"submit",style:{visibility:"hidden",height:0,width:0}})]}),o(h,{message:`by ${V}`}),o("br",{}),o(h,{message:"Note! When you sign the book, it will no longer be editable."})]}):u("div",{className:`${n.titleContent}`,children:[o(h,{message:"Book Name Here"}),o("br",{}),o(h,{message:"by: Author"})]})})]}),u("div",{className:n.actions,children:[d&&o(f,{onClick:R,children:c?"Sign and Save":"Sign"}),d&&!c&&o(f,{onClick:R,children:"Sign"}),d&&!c&&o(f,{onClick:ie,children:"Edit"}),o(f,{onClick:se,children:c?"Cancel":"Close"})]})]})},G=v;try{v.displayName="Book",v.__docgenInfo={description:"",displayName:"Book",props:{textPages:{defaultValue:null,description:"",name:"textPages",required:!0,type:{name:"string[]"}},editable:{defaultValue:null,description:"",name:"editable",required:!0,type:{name:"boolean"}},onSign:{defaultValue:null,description:"",name:"onSign",required:!0,type:{name:"(textPages: string[], title: string) => void"}},onEdit:{defaultValue:null,description:"",name:"onEdit",required:!0,type:{name:"(textPages: string[]) => void"}},onClose:{defaultValue:null,description:"",name:"onClose",required:!0,type:{name:"() => void"}},author:{defaultValue:null,description:"",name:"author",required:!0,type:{name:"string"}}}}}catch{}const $e={title:"Components/Book",component:G},Me=m=>o(G,{...m}),H=Me.bind({});H.args={textPages:["Page 1: This is some text for page 1.","Page 2: This is some text for page 2.","Page 3: This is some text for page 3.","Page 4: This is some text for page 4.","Page 5: This is some text for page 5."],editable:!0,onSign:(m,d)=>console.log("Signed with pages:",m,"Title:",d),onEdit:m=>console.log("Edit with pages:",m),onClose:()=>console.log("Closed book"),author:"Author"};var F,W,Z;H.parameters={...H.parameters,docs:{...(F=H.parameters)==null?void 0:F.docs,source:{originalSource:"args => <Book {...args} />",...(Z=(W=H.parameters)==null?void 0:W.docs)==null?void 0:Z.source}}};const et=["Default"];export{H as Default,et as __namedExportsOrder,$e as default};
//# sourceMappingURL=Book.stories-c4cc7fc9.js.map
