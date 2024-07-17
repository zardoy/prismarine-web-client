async function test() {
  console.log('async started')
  let result = await new Promise(function (resolve, reject) {
    setTimeout(() => {
      resolve('success')
    }, 3000)
  })
  console.log('exit async function. Result:', result)
}

console.log('test started')
test()
console.log('test ended')
