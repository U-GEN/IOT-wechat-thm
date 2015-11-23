window.onload = function(){
	var password = getParameterByName('pwd');
	// password = 123456;
	$("#pwdSpan").html(password);
	//获得二维码URL
	var ticket =  getParameterByName('ticket');
	if(ticket == null){
	ticket = "http://we.qq.com/d/AQDeiYG3fNLNqeE7joD34HhwGVadjgnt1oGQFS6C#97256c69-6723-43fb-87dc-167eaf9dc501";
		
	}
	console.log("ticket:"+ticket);
	
	//动态创建二维码
	var qrcode = $('#qrcode');
	$('#qrcode').qrcode({ 
	    render: "canvas", //canvas方式 
	    width: 150, //宽度 
	    height:150, //高度 
	    text: ticket //任意内容 
	});
	var img = document.getElementById("shareImg");
	//获取动态创建的二维码canvas,由于该canvas创建时设置宽度整个二维码会拉伸撑满。
	//创建后修改宽度，已绘制的图案会被刷新。因此另外需要用到一个设定好样式的canvas
	var cav = $("canvas").get(0);
	var ctx = cav.getContext("2d");			
	var cavx = document.getElementById("shareCanvas");
	var ctxx = cavx.getContext('2d');
	//将二维码转成imageData
	var cavData = ctx.getImageData(0,0,150,150);
	//将取出的imageData添加到自建canvas左边
	ctxx.putImageData(cavData,0,0);
	var imgData = ctxx.getImageData(0,0,300,150);
	var imgURL = cavx.toDataURL("image/png");
  	img.src=imgURL;
}