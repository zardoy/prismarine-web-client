import{a as s,j as e}from"./jsx-runtime-37f7df21.js";import{M as i}from"./MessageFormattedString-24d5abea.js";import{r as y}from"./MessageFormatted-ac3715c5.js";import"./index-f1f2c4b1.js";import"./chatUtils-3faa5944.js";import"./simpleUtils-f26d34af.js";import"./Button-171a86dd.js";import"./SharedHudVars-63c800bd.js";import"./PixelartIcon-62975882.js";import"./vanilla-66a0fdf5.js";function t({title:o,items:d,open:p,style:u}){return p?s("div",{className:"scoreboard-container",style:u,children:[e("div",{className:"scoreboard-title",children:e(i,{message:o})}),d.map(r=>{const n=r.displayName??r.name;return s("div",{className:"item-container",children:[e("div",{className:"item-name",children:e(i,{message:n})}),e("div",{className:"item-value",children:r.value})]},y(n)+"_"+r.value)})]}):null}try{t.displayName="Scoreboard",t.__docgenInfo={description:"",displayName:"Scoreboard",props:{title:{defaultValue:null,description:"",name:"title",required:!0,type:{name:"string"}},items:{defaultValue:null,description:"",name:"items",required:!0,type:{name:"ScoreboardItems"}},open:{defaultValue:null,description:"",name:"open",required:!0,type:{name:"boolean"}},style:{defaultValue:null,description:"",name:"style",required:!1,type:{name:"CSSProperties"}}}}}catch{}const V={component:t},a={args:{title:"Scoreboard",items:[{name:"item 1",value:9},{name:"item 2",value:8}],open:!0}};var m,l,c;a.parameters={...a.parameters,docs:{...(m=a.parameters)==null?void 0:m.docs,source:{originalSource:`{
  args: {
    title: 'Scoreboard',
    items: [{
      name: 'item 1',
      value: 9
    }, {
      name: 'item 2',
      value: 8
    }],
    open: true
  }
}`,...(c=(l=a.parameters)==null?void 0:l.docs)==null?void 0:c.source}}};const j=["Primary"];export{a as Primary,j as __namedExportsOrder,V as default};
//# sourceMappingURL=Scoreboard.stories-95737640.js.map
