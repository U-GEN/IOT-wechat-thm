/**
 * Created by CJLIU on 2015/9/20.
 */
$(document).ready(function () {

    var colors;//保存温度色码的数组
    var bars;//温度条件面板总div
    var colorBars;//色彩温度条的选择器
    var circle;//指向温度条的红点
    var setTemperature;//st温度初始值
    var currentTemperature;//ct温度
    var btnId;//调节温度的btn
    var rad2deg = 180 / Math.PI;
    var temperature = $("#st");//#st
    var timer;//调温按钮X秒内无操作下发数据用到的计时器的id
    var count = true;//控制设定温度只接收第一次下发数据的开关。
    var client;//mqtt clinet
    var connect = false;//mqtt 连接标识

    // 得到设备ID
    var device_id = getParameterByName('device_id');
    // 得到别名
    var alias = getParameterByName('alias');
    // 设置title
    document.title = "泰和美 " + alias;
    // 得到用户的token
    var access_token = getParameterByName('access_token');
    // 得到请求的sign
    var requestSign = getRequestSign();
    // 设置庆科云api请求头部参数（V1 只需要Authorization）
    var requestHeader = {
        'Authorization': 'token ' + access_token,
        'X-Application-Id': appId,
        'X-Request-Sign': requestSign
    };
    var userName = getUserName(access_token, requestHeader);
    // 如果设备ID为空
    if (device_id == null) return;

    $(".loading").show();
    setTimeout(function () {
        if ($(".loading").is(":visible")) {
            modalInitializationOne("连接未成功，请重试...");
        }
    }, loadingTime);

    var onOffPower = $(".onOff_Power");
    var onOffSleep = $(".onOff_sleep");
    var onOffAntifreeze = $(".onOff_antifreeze");
    var onOffTime = $(".onOff_time");
    var onFinesleep = $(".onOff_finesleep");

    // 初始化温度调节面板
    initializationPanel();
    // 从云端得到设备历史数据
    getDeviceInfo(device_id);
    // 连接mqtt
    ez_connect(device_id);
    // 设置电源开关
    setPow();
    // 设置睡眠模式
    setSleepMode();
    // 设置防冻模式
    setFreezeMode();
    // 设置减少温度
    setTmpLeft();
    // 设置增加温度
    setTmpRight();
    // 设置定时模式
    setTimeMode();


    // 连接MQTT服务
    function ez_connect(device_id) {
        // websocket连接
        var wsbroker = "api.easylink.io";  //mqtt websocket enabled broker
        var wsport = 1983; // port for above
        client = new Paho.MQTT.Client(wsbroker, wsport, "v1-web-" + parseInt(Math.random() * 1000000, 12));
        mqttClientInit();

        function mqttClientInit() {
            // 基本参数配置
            // 连接丢失所对应的callback函数
            client.onConnectionLost = onConnectionLost;
            // 消息到达所对应的callback函数
            client.onMessageArrived = onMessageArrived;
            // 连接成功所对应的callback函数
            client.connect({onSuccess: onConnect});
        }

        /* 连接成功 */
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

        /* 连接丢失 */
        function onConnectionLost(responseObject) {
            if (responseObject.errorCode !== 0)
                console.log("onConnectionLost:" + responseObject.errorMessage);
            connect = false;
            var reconnectNum = 0;
            var connectTimer = setInterval(function () {
                console.log(reconnectNum);
                if (connect == false) {
                    client = new Paho.MQTT.Client(wsbroker, wsport, "v1-web-" + parseInt(Math.random() * 1000000, 12));
                    mqttClientInit();
                } else {
                    clearInterval(connectTimer);
                }
                if (reconnectNum > 100) {
                    clearInterval(connectTimer);
                    modalInitializationOne("连接丢失，请重新连接...");
                    client = new Paho.MQTT.Client(wsbroker, wsport, "v1-web-" + parseInt(Math.random() * 1000000, 12));
                    mqttClientInit();
                }
                reconnectNum++;
            }, 6000);
        }

        /* 消息到达 */
        function onMessageArrived(message) {
            console.log(message.destinationName + ': ' + message.payloadString);
            if (message.destinationName == device_id + '/out/_online') {
                if (message.payloadString == '0') {
                    //设备离线
                    displayOffline();
                } else {
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
    }

    /* 云端获取设备信息 */
    function getDeviceInfo(device_id) {
        $("#jumbotron").removeClass('offline_state');//移除设备状态灰色背景
        var deviceInfo = getDeviceProperties(requestHeader, device_id);
        console.log('deviceInfo', deviceInfo);
        var info = {};
        $.each(deviceInfo, function (i, _data) {
            info[_data.name] = _data.value;
        });
        if (info) {
            displayInfo(info);
        }
    };

    /* 设备离线样式 （上半部分显示成灰色） */
    function displayOffline() {
        $("#err").html('<span></span>' + "设备已离线");
        $("#jumbotron").addClass('offline_state');
    }

    /* 主控页面数据填充 */
    function displayInfo(info) {
        if (_.has(info, 'deviceControl') && info.deviceControl == 0) {
            var role = getDeviceUser(device_id, requestHeader, userName);
            if (role == 'share') {
                $(".role").show();
            }
        }
        //设备开关
        if (_.has(info, "POW")) {
            var intPOW = parseInt(info.POW);
            console.log(((info.POW == '1') ? "开机" : "关机"));
            onOffPower.data("power", intPOW);
            mask(intPOW);
            onOffSwitch(intPOW, onOffPower);
        }
        //定时 (同设备开关处理 0为关闭蓝色，其他红色)
        if (_.has(info, "FT")) {
            console.log(((info.FT == '0') ? "无定时设定" : info.FT + "小时后关机"));
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

    /* 设置电源开关 */
    function setPow() {
        onOffPower.on("click", function () {
            var state = onOffPower.data("power");
            state = !state ? 1 : 0;
            onOffPower.data("power", state);
            //下发电源开关
            var topic = device_id + '/in/';
            var commond = '{"POW":"' + state + '"}';
            client.publish(topic, commond);
            mask(state);
            onOffSwitch(state, onOffPower);
        });
    }

    /* 设置温度减少 */
    function setTmpLeft() {
        $("#tmpLeft").on("touchstart", function () {
            if (setTemperature <= 10) {
                return;
            }
            setTemperature--;
            temperature.text(setTemperature);
            setSendingTime();
        });
    }

    /* 设置温度增加 */
    function setTmpRight() {
        $("#tmpRight").on("touchstart", function () {
            if (setTemperature >= 60) {//温度大于60度则返回无法继续点击
                return;
            }
            setTemperature++;
            temperature.text(setTemperature);
            setSendingTime();
        });
    }

    /* X秒内对调温按钮无操作则上发数据 */
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
    function setTimeMode() {
        $('#finalTime').change(function () {
//			var showTime = onOffTime.data("time");//定时时间（小时）
//          showTime = $("#finalTime").children('option:selected').val().split('小')[0];
			var showTime=$("#finalTime").get(0).selectedIndex
            if(showTime=="0"){
            	modalInitializationTwo("确定取消定时?");
            }else{
				modalInitializationTwo("确定" + $("#finalTime").children('option:selected').val() + "后关机?");
            }
			$("#confirmButton").on('click',function(){
                onOffTime.data('time', showTime);
                    //下发定时关机
                var topic = device_id + '/in/';
                var commond = '{"FT":"' + showTime + '"}';
                client.publish(topic, commond);
//              }
                onOffSwitch(showTime, onOffTime);
                $("#confirmModal").modal('hide');
			});
        });
    }

    /* 设置睡眠模式 */
    function setSleepMode() {
        onOffSleep.on("click", function () {
            var state = onOffSleep.data("sleep");
            state = !state ? 1 : 0;
            onOffSleep.data("sleep", state);
            //睡眠模式下发
            var topic = device_id + '/in/';
            var commond = '{"SM":"' + state + '"}';
            client.publish(topic, commond);
            onOffSwitch(state, onOffSleep);
        });
    }

    /* 设置防冻模式 */
    function setFreezeMode() {
        onOffAntifreeze.on("click", function () {
            var state = onOffAntifreeze.data("antifreeze");
            state = !state ? 1 : 0;
            onOffAntifreeze.data("antifreeze", state);
            //睡眠防冻下发
            var topic = device_id + '/in/';
            var commond = '{"FM":"' + state + '"}';
            client.publish(topic, commond);
            onOffSwitch(state, onOffAntifreeze);
        });
    }

    /* 控制开关状态 */
    function onOffSwitch(state, switchName) {
        if (state == '0') {
            switchName.parent().removeClass('switch_on_state');
        } else {
            switchName.parent().addClass('switch_on_state');
        }
    }

    /* 电源关闭后的蒙版 */
    function mask(power) {
        if (power == 0) {
            $("#control_panel").addClass('powerSwitch_off_state');
        } else {
            $("#control_panel").removeClass('powerSwitch_off_state');
        }
    }

    /* 初始化温度调节面板 */
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

        /*监听温度值数字变化*/
        temperature.bind('DOMNodeInserted', function () {
            temperatureChange();
        });
    }

    /* 判断温度值来隐藏调控按钮及温度色条变灰 */
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
