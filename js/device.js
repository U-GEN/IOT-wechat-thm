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
    var rad2deg = 180 / Math.PI;
    var temperature = $("#st");//#st
    var loadingTime = 20000;//用于loading时X秒内未链接则弹出提示
    var timer;
    var setTimer = 2000;//用于调温按钮X秒内无操作则上发数据
    var count = true;//控制设定温度只接收第一次下发数据的开关。
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
        setTimeout(function () {
            if ($(".loading").is(":visible")) {
                alert("连接未成功，请重试...");
            }
        }, loadingTime);
        var access_token = getParameterByName('access_token');
        getDeviceInfo(access_token, device_id);

        document.title = "泰和美 " + alias;
        // websocket连接
        var wsbroker = "api.easylink.io";  //mqtt websocket enabled broker
        var wsport = 1983 // port for above
        var client = new Paho.MQTT.Client(wsbroker, wsport, "v1-web-" + parseInt(Math.random() * 1000000, 12));
        var connect = false;
        init();
        function init(){
			// 基本参数配置
			// 连接丢失所对应的callback函数
			client.onConnectionLost = onConnectionLost;
			// 消息到达所对应的callback函数
			client.onMessageArrived = onMessageArrived;
			// 连接成功所对应的callback函数
			client.connect({onSuccess: onConnect});
		}

        /**
         * 云端获取设备信息
         * @param access_token
         * @param device_id
         */
        function getDeviceInfo(access_token, device_id) {
        	$("#jumbotron").removeClass('offline_state');//移除设备状态灰色背景
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
                    if (info) {
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
			connect = true;
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

			connect = false;
            var reconnectNum = 0;
            var connectTimer = setInterval(function(){
                console.log(reconnectNum);
                if(connect == false){
                    client = new Paho.MQTT.Client(wsbroker, wsport, "v1-web-" + parseInt(Math.random() * 1000000, 12));
                    init();
                }else{
                    clearInterval(connectTimer);
                }
                if(reconnectNum >100){
                    clearInterval(connectTimer);
                    alert("连接丢失，请重新连接...");
                    client = new Paho.MQTT.Client(wsbroker, wsport, "v1-web-" + parseInt(Math.random() * 1000000, 12));
                    init();
                }
                reconnectNum++;
            },6000);
        }

        // 消息到达
        function onMessageArrived(message) {
            console.log(message.destinationName + ': ' + message.payloadString);
            if (message.destinationName == device_id + '/out/_online') {
                if (message.payloadString == '0') {
                    //设备离线
                    displayOffline();
                }else{
                    getDeviceInfo(access_token, device_id);
                }
            } else {
                try {
                    var info = JSON.parse(message.payloadString);
                } catch (e) {

                }
            }
            if (info) {
                displayInfo(info);
            }
        }
        /**
         * 设备离线样式 （上半部分显示成灰色）
         */
        function displayOffline() {
            $("#err").html('<span></span>' + "设备已离线");
            $("#jumbotron").addClass('offline_state');
        }

        var onOffPower = $(".onOff_Power");
        var onOffSleep = $(".onOff_sleep");
        var onOffAntifreeze = $(".onOff_antifreeze");
        var onOffTime = $(".onOff_time");
        var onFinesleep = $(".onOff_finesleep");
        //显示
        function displayInfo(info) {
            //设备开关
            if (_.has(info, "POW")) {
            	var intPOW = parseInt(info.POW);
                console.log(((info.POW == '1') ? "开机" : "关机"));
				onOffPower.data("power",intPOW);				
                mask(intPOW);
                onOffSwitch(intPOW, onOffPower);
            }
            //定时 (同设备开关处理 0为关闭蓝色，其他红色)
            if (_.has(info, "FT")) {
				console.log(((info.FT == '0') ? "无定时设定" : info.FT+"小时后关机"));
				var intFT = parseInt(info.FT);
				onOffTime.data('time', intFT);
				onOffSwitch(intFT, onOffTime);
            }
            //设定水温
            if (_.has(info, "ST")) {
                console.log(info.ST);
                var intST = parseInt(info.ST);
                if (count && intST <= 60 && intST >= 10) {
                    setTemperature = intST;
                    temperature.text(setTemperature);
                } else {
                }
            }
            //当前水温
            if (_.has(info, "CT")) {
                if (!!info.CT) {
                    $(".loading").hide();
                }
                console.log(info.CT);
                var intCT = parseInt(info.CT);
                $("#ct").empty().children().remove();
                $("#ct").append('<span>' + intCT + '</span>℃');
                currentTemperature = intCT;
            }
            //睡眠模式
            if (_.has(info, "SM")) {
                console.log(((info.SM == '1') ? "睡眠" : "正常"));
                var intSM = parseInt(info.SM);
                onOffSleep.data("sleep", intSM);
                onOffSwitch(intSM, onOffSleep);
            }
            //防冻模式
            if (_.has(info, "FM")) {
                console.log(((info.FM == '1') ? "防冻开启" : "防冻关闭"));
                var intFM = parseInt(info.FM);
                onOffAntifreeze.data("antifreeze", intFM);
                onOffSwitch(intFM, onOffAntifreeze);
            }
            //剩余关机时间
            if (_.has(info, "LT")) {
                var lt = formatMinutes(info.LT);
                $("#lt").text("剩余运行时间：" + lt);
            }
            //错误报警
            if (_.has(info, "ERR")) {
                var msg = ["设备正常", "水泵或电磁阀故障", "温度传感器故障", "水位低", "水温超65度", "水温低于5度"];
				var intERR = parseInt(info.ERR);
                if (intERR == 0) {
                    $("#err").text(msg[info.ERR]);
                } else {
                    $("#err").html('<span></span>' + msg[intERR]);
                }

            }
            temperatureChange();
        }

        onOffPower.on("click", setPow);
        onOffSleep.on("click", setSleepMode);
        onOffAntifreeze.on("click", setFreezeMode);
        /*监听温度值数字变化*/
        temperature.bind('DOMNodeInserted', function () {
            temperatureChange();
        });
        $("#tmpLeft").on("touchstart", setTmpLeft);
        $("#tmpRight").on("touchstart", setTmpRight);
        
        $("#finalTime").get(0).selectedIndex=-1;//设置预约定时下拉框默认为无选择
	    $('#finalTime').change(function(){
	    	var r = confirm("确定"+$("#finalTime").children('option:selected').val()+"?")
	    	if(r==true){
	    		setTimeMode();
	    	}
		});

        /* 设置电源开关 */
        function setPow() {
            var state = onOffPower.data("power");
            state = !state ? 1 : 0;
            onOffPower.data("power", state);
            //下发电源开关
            var topic = device_id + '/in/';
            var commond = '{"POW":"' + state + '"}';
            client.publish(topic, commond);
            mask(state);
            onOffSwitch(state, onOffPower);
        }
        
        /*设置温度减少*/
        function setTmpLeft() {
            if (setTemperature <= 10) {
                return;
            }
            setTemperature--;
            temperature.text(setTemperature);
            setSendingTime();
        }

        /*设置温度增加*/
        function setTmpRight() {
            if (setTemperature >= 60) {//温度大于60度则返回无法继续点击
                return;
            }
            setTemperature++;
            temperature.text(setTemperature);
            setSendingTime();
        }

        //X秒内对调温按钮无操作则上发数据
        function setSendingTime() {
            if (!!timer) {
                clearTimeout(timer);
                count = false;
            }
            timer = setTimeout(function () {
                setTmp(setTemperature);
                count = true;
            }, setTimer);
        }

        /* 设置温度 */
        function setTmp(tmp) {
            //下发温度
            var topic = device_id + '/in/';
            var commond = '{"ST":"' + tmp + '"}';
            client.publish(topic, commond);
        }

		/* 设置定时模式 */
		function setTimeMode(){
			var showTime=onOffTime.data("time");//定时时间（小时）
            showTime = $("#finalTime").children('option:selected').val().split('小')[0];
			onOffTime.data('time', showTime);
            if (showTime != 0) {
                //下发定时关机
                var topic = device_id + '/in/';
                var commond = '{"FT":"' + showTime + '"}';
                client.publish(topic, commond);
            }
            onOffSwitch(showTime, onOffTime);
 
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
            onOffSwitch(state, onOffSleep);
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
            onOffSwitch(state, onOffAntifreeze);
        }
        
        /**控制开关状态*/
        function onOffSwitch(state, switchName) {
            if (state == '0') {
                switchName.parent().removeClass('switch_on_state');
            } else {
                switchName.parent().addClass('switch_on_state');
            }
        } 
        
        /* 电源关闭后的蒙版*/
        function mask(power){
        	if(power==0){
				$("#control_panel").addClass('powerSwitch_off_state');
        	}else{
				$("#control_panel").removeClass('powerSwitch_off_state');
        	}
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

    function initializationPanel() {
        colors = [
            'e8e3e4', 'e9d7d7', 'eac9c7', 'ebbcb8', 'edafa8',
            'eea298', 'ef9488', 'f18779', 'f27a69', 'f34f36'
        ];
        //设置温度数值初始值
        temperature.text(setTemperature);
        colorBars = $("#progressBars li span");
        circle = $("#progressBars li");
        temperatureChange();
    }

    //判断温度值来隐藏调控按钮及温度色条变灰
    function temperatureChange() {
        if (setTemperature == 60) {
            $("#tmpRight span").hide();
        } else if (setTemperature == 10) {
            $("#tmpLeft span").hide();
        } else {
            $("#tmpRight span").show();
            $("#tmpLeft span").show();
        }
        var numBars = 0;
        numBars = Math.floor(setTemperature / 5);
        colorBars.removeClass('active').slice(1, numBars - 2).addClass('active');
        circle.removeClass('showRound').slice(numBars - 3, numBars - 2).addClass('showRound');

        $("#progressBars").children().each(function (i) {

            var pbChildren = $(this).find('span');
            var liCliss = pbChildren.attr('class');

            if (temperature.text() > currentTemperature) {
                $("#jumbotron").removeClass('moreThan_tmpTarget');
                if (liCliss == 'active') {
                    pbChildren.css('background', '-webkit-radial-gradient(transparent 60%, #' + colors[i] + ' 35%)');
                } else {
                    pbChildren.css('background', '-webkit-radial-gradient(transparent 60%, #e7eaed 35%)');
                }
            } else if (temperature.text() <= currentTemperature) {
                $("#jumbotron").addClass('moreThan_tmpTarget');
                pbChildren.css('background', '-webkit-radial-gradient(transparent 60%, #e7eaed 35%)');
            }

        });
    }

})
