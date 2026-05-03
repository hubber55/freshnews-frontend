const { JSDOM } = require('jsdom');
const jsdom = new JSDOM(`<!DOCTYPE html><html><head></head><body>
<div id="ntv_2104551"></div>
<script type="text/javascript">
(function(d) {
	var params =
	{
		bvwidgetid: "ntv_2104551",
		bvlinksownid: 2104551,
		rows: 1,
		cols: 1,
		textpos: "below",
		imagewidth: 250,
		mobilecols: 1,
		cb: (new Date()).getTime()
	};
	params.bvwidgetid = "ntv_2104551" + params.cb;
	d.getElementById("ntv_2104551").id = params.bvwidgetid;
	var qs = Object.keys(params).reduce(function(a, k){ a.push(k + '=' + encodeURIComponent(params[k])); return a},[]).join(String.fromCharCode(38));
	var s = d.createElement('script'); s.type='text/javascript';s.async=true;
	var p = 'https:' == document.location.protocol ? 'https' : 'http';
	s.src = p + "://cdn.hyperpromote.com/bidvertiser/tags/active/bdvws.js?" + qs;
	d.getElementById(params.bvwidgetid).appendChild(s);
})(document);
</script>
</body></html>`, {
  url: "https://freshnews.top/",
  runScripts: "dangerously",
  resources: "usable"
});

jsdom.window.document.addEventListener('DOMContentLoaded', () => {
  console.log("DOM loaded");
});

// Intercept requests
const resourceLoader = jsdom.window._resourceLoader;
// this is hard in jsdom, we can instead mock fetch or XMLHttpRequest, but JSDOM resources="usable" handles scripts.
setTimeout(() => {
    console.log("Scripts after 5s:");
    const scripts = jsdom.window.document.querySelectorAll('script');
    scripts.forEach(s => console.log(s.src || "inline"));
    
    console.log("Body HTML:");
    console.log(jsdom.window.document.body.innerHTML);
}, 5000);
