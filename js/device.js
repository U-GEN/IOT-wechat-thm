/**
 * Created by CJLIU on 2015/9/20.
 */
$(document).ready(function () {
	
	var colors;//保存温度色码的数组
	var bars;//温度条件面板总div
	var circle;//指向温度条的红点
	var setTemperature;//st温度初始值
	var currentTemperature;//ct温度
	var btnId;//调节温度的btn
	var rad2deg = 180/Math.PI;
	var temperature = $("#st");//#st
	var loadingTime=20000;//用于loading时X秒内未链接则弹出提示
	var timer;
	var setTimer=2000;//用于调温按钮X秒内无操作则上发数据
	var count=true;//控制设定温度只接收第一次下发数据的开关。
	//初始化温度调节面板
	initializationPanel();
    // 得到设备ID
    var device_id = getParameterByName('device_id');
    var alias = getParameterByName('alias');
    // 如果设备ID不为空，则执行连接MQTT的操作
    if (device_id !== null) {
        ez_connect(device_id);
    }
    // 连接MQTT服务
    function ez_connect(device_id) {
    	$(".loading").show();		
        setTimeout(function(){
        	if($(".loading").is(":visible")){
				alert("连接未成功，请重试...");
			}   
        },loadingTime);
        var access_token = getParameterByName('access_token');
        getDeviceInfo(access_token, device_id);

//      clearInterval(loadingTime);

        document.title = "泰和美" + alias;
        // websocket连接
        var wsbroker = "api.easylink.io";  //mqtt websocket enabled broker
        var wsport = 1983 // port for above
        var client = new Paho.MQTT.Client(wsbroker, wsport, "v1-web-" + parseInt(Math.random() * 1000000, 12));
        // 基本参数配置
        // 连接丢失所对应的callback函数
        client.onConnectionLost = onConnectionLost;
        // 消息到达所对应的callback函数
        client.onMessageArrived = onMessageArrived;
        // 连接成功所对应的callback函数
        client.connect({onSuccess: onConnect});

        function getDeviceInfo(access_token, device_id) {
            $.ajax({
                type: "POST",
                url: "http://api.easylink.io/v1/device/property/list",
                data: {
                    "device_id": device_id
                },
                headers: {
                    "AUTHORIZATION": "token " + access_token
                },
            success: function (data) {
                var info = {};
                $.each(data, function (i, _data) {
                    info[_data.name] = _data.value;
                });
                if(info){
                    console.log(info);
                    displayInfo(info);
                }
            },
            error: function (data) {
                console.log(data);
            }
        });
        };
        // 连接成功
        function onConnect() {
            var subtopic = device_id + '/out/#';
            client.publish = function (topic, commond) {
                console.log("现在执行-->:" + commond);
                message = new Paho.MQTT.Message(commond);
                message.destinationName = topic;
                client.send(message);
            }
            console.log("device_id:" + device_id);
            console.log("onConnect");
            client.subscribe(subtopic, {qos: 0});
        }

        // 连接丢失
        function onConnectionLost(responseObject) {
            if (responseObject.errorCode !== 0)
                console.log("onConnectionLost:" + responseObject.errorMessage);
                alert("连接丢失，请重新连接...");
//              var alias = device[3] ? device[3] : "TH-1507";
//               console.log(alias);
        }

        // 消息到达
        function onMessageArrived(message) {
            console.log(message.destinationName + ': ' +  message.payloadString);
            if  (message.destinationName == device_id + '/out/_online') {
    			if (message.payloadString == '0')  {
    				//设备离线
    				displayOffline();
    			}
    		}else{
    			try {
        			var info = JSON.parse(message.payloadString);	
    			} catch (e) {

    			}
    		}
    		if(info){
    			displayInfo(info);
    		}
        }
		
        function displayOffline() {
			$("#err").html('<span></span>'+"设备已离线");
        }

		var onOffPower = $(".onOff_Power");
		var onOffSleep = $(".onOff_sleep");
		var onOffAntifreeze = $(".onOff_antifreeze");
        //显示
        function displayInfo(info) {
            //设备开关
            if (_.has(info, "POW")) {
                console.log(((info.POW == '1') ? "开机" : "关机"));
                console.log("aaasdd"+info.POW);
				onOffPower.attr("data-power",info.POW);
                console.log("$('.onOff_Power').data('power')="+$(".onOff_Power").data("power"));
                onOffSwitch(info.POW,onOffPower);
            }
            //定时
            if (_.has(info, "FT")) {
                console.log(info.FT);
            }
            //设定水温
            if (_.has(info, "ST")) {
                console.log(info.ST);              
            	if(count&&info.ST<=60&&info.ST>=10){
            		setTemperature = info.ST;
            		temperature.text(setTemperature);
                }else{
                }				
            }
            //当前水温
            if (_.has(info, "CT")) {
            	if(!!info.CT){
	           		$(".loading").hide();
	            }   
                console.log(info.CT);
                $("#ct").empty().children().remove();
                $("#ct").append('<span>'+ info.CT +'</span>℃');
                currentTemperature = info.CT;
            }
            //睡眠模式
            if (_.has(info, "SM")) {
                console.log(((info.SM == 1) ? "睡眠" : "正常"));
				onOffSleep.attr("data-sleep",info.SM);
                console.log("$('.onOff_sleep').data('sleep')="+$(".onOff_sleep").data("sleep"));
                onOffSwitch(info.SM,onOffSleep);
            }
            //防冻模式
            if (_.has(info, "FM")) {
                console.log(((info.FM == 1) ? "防冻开启" : "防冻关闭"));
				onOffAntifreeze.attr("data-antifreeze",info.FM);
                console.log("$('.onOff_antifreeze').data('antifreeze')="+$(".onOff_antifreeze").data("antifreeze"));
                onOffSwitch(info.FM,onOffAntifreeze);
            }
            //剩余关机时间
            if (_.has(info, "LT")) {
                var lt = formatMinutes(info.LT);
                $("#lt").text("剩余运行时间：" + lt);
            }
            //错误报警
            if (_.has(info, "ERR")) {
                var msg = ["设备正常", "水泵或电磁阀故障", "温度传感器故障", "水位低", "水温超65度", "水温低于5度"];
          
               if(info.ERR==0){
                	$("#err").text(msg[info.ERR]);
                }else{
                	$("#err").html('<span></span>'+msg[info.ERR]);
                }
                
                
            }
            temperatureChange();
        }

        $(".onOff_Power").on("click", setPow);
        $(".onOff_sleep").on("click", setSleepMode);
        $(".onOff_antifreeze").on("click", setFreezeMode);
        /*监听温度值数字变化*/
		temperature.bind('DOMNodeInserted', function(){	
			temperatureChange();
		});		
		$("#tmpLeft").on("touchstart", setTmpLeft);
	    $("#tmpRight").on("touchstart", setTmpRight);
//	    $('#finalTime').change(function(){ 
//			setFinalTime();
//		})
//	    $('#finalTime').on('change',setFinalTime);

        /* 设置电源开关 */
        function setPow() {
            var state = onOffPower.data("power");
            state = !state ? 1 : 0;
            onOffPower.data("power", state);
            //下发电源开关
            var topic = device_id + '/in/';
            var commond = '{"POW":"' + state + '"}';
            client.publish(topic, commond);
            onOffSwitch(state,onOffPower);
        }
        
       /**控制开关状态*/
        function onOffSwitch(state,switchName){
        	if(state=='1'){
//      		console.log("state=开");
				switchName.addClass('switch_on_state');
			}else{
//				console.log("state=关");
				switchName.removeClass('switch_on_state');
			}
        }
		
		/*设置温度减少*/
		function setTmpLeft(){
			if(setTemperature <= 10){
				return;
			}
			setTemperature--;
			temperature.text(setTemperature);
			setSendingTime();
		}
		
		/*设置温度增加*/
		function setTmpRight(){
//			$("#tmpLeft span").show();
			if(setTemperature>=60){//温度大于60度则返回无法继续点击
				return;
			}
			setTemperature++;
			temperature.text(setTemperature);
			setSendingTime();
		}
		//X秒内对调温按钮无操作则上发数据
		function setSendingTime(){
			if(!!timer){
					clearTimeout(timer);
					console.log("asdfg");
					count=false;
				}
				timer = setTimeout(function(){
					setTmp(setTemperature);
					count=true;
				},setTimer);
		}
        /* 设置温度 */
        function setTmp(tmp) {
            //下发温度
            var topic = device_id + '/in/';
            var commond = '{"ST":"' + tmp + '"}';
            client.publish(topic, commond);
        }
        /* 设置定时关机 */
        function setFinalTime() {
        	var finalTime = $("#finalTime");
            var time=$('#finalTime').children('option:selected').val();
            if(time != finalTime.find('option:first').val()){
            	//下发定时关机
	            var topic = device_id + '/in/';
	            var commond = '{"FT":"' + time.charAt(0) + '"}';
	            client.publish(topic, commond);
            }
            
        }

        /* 设置睡眠模式 */
        function setSleepMode() {
            var state = onOffSleep.data("sleep");
            state = !state ? 1 : 0;
            onOffSleep.data("sleep", state);
            //睡眠模式下发
            var topic = device_id + '/in/';
            var commond = '{"SM":"' + state + '"}';
            client.publish(topic, commond);
            onOffSwitch(state,onOffSleep);
        }

        /* 设置防冻模式 */
        function setFreezeMode() {
            var state = onOffAntifreeze.data("antifreeze");
            state = !state ? 1 : 0;
            onOffAntifreeze.data("antifreeze", state);
            //睡眠防冻下发
            var topic = device_id + '/in/';
            var commond = '{"FM":"' + state + '"}';
            client.publish(topic, commond);
            onOffSwitch(state,onOffAntifreeze);
        }
    }

    /**
     * 从url中获取某个参数的值
     * @param name
     * @returns {Array|{index: number, input: string}|string}
     */
    function getParameterByName(name) {
        var match = RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
        return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
    }

    /**
     * 格式化分钟至 x小时x分钟
     * @param value
     * @returns {string}
     */
    function formatMinutes(value) {
        var minutes = parseInt(value);
        var result = "";
        var hours = parseInt(minutes / 60);
        minutes = parseInt(minutes % 60);
        if (minutes != 0) {
            result = minutes + "分钟";
        }
        if (hours > 0) {
            result = hours + "小时" + result;
        }
        return result;
    }
	/**
	* 初始化温度调节面板
	* */
	var colorBars;
	function initializationPanel(){
		colors = [
			'e8e3e4','e9d7d7','eac9c7','ebbcb8','edafa8',
			'eea298','ef9488','f18779','f27a69','f34f36'
		];			
		//设置温度数值初始值
		temperature.text(setTemperature);
		
		colorBars = $("#progressBars li span");
		circle = $("#progressBars li");
		temperatureChange();
	}
	
	//判断温度值来隐藏调控按钮及温度色条变灰
	function temperatureChange(){
		if(setTemperature==60){
			$("#tmpRight span").hide();
		}else if(setTemperature==10){
			$("#tmpLeft span").hide();
		}else{
			$("#tmpRight span").show();
			$("#tmpLeft span").show();
		}
		var numBars=0;
		numBars = Math.floor(setTemperature/5);
		colorBars.removeClass('active').slice(1, numBars-2).addClass('active');
		circle.removeClass('showRound').slice(numBars-3, numBars-2).addClass('showRound');
		
		$("#progressBars").children().each(function(i){
			
			var pbChildren = $(this).find('span');
			var liCliss = pbChildren.attr('class');
			
			if(temperature.text()>currentTemperature){
				$("#jumbotron").removeClass('moreThan_tmpTarget');
				if(liCliss == 'active'){
					pbChildren.css('background', '-webkit-radial-gradient(transparent 60%, #'+colors[i]+' 35%)');	
				}else{					
					pbChildren.css('background', '-webkit-radial-gradient(transparent 60%, #e7eaed 35%)');
				}
			}else if(temperature.text()<=currentTemperature){
				$("#jumbotron").addClass('moreThan_tmpTarget');
				pbChildren.css('background', '-webkit-radial-gradient(transparent 60%, #e7eaed 35%)');
			}
						
	    });
	}

})
