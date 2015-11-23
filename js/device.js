/**
 * Created by CJLIU on 2015/9/20.
 */
$(document).ready(function () {
    // 是否可以hide loading 标记 （条件收到CT 并且微信config 注册成功）
    var wxRes = false;
    //微信jssdk配置 正式需打开
    var signInfo = getWechatSignInfo();
    var wechatSign = getWechatSign(signInfo);
    wechatConfig(signInfo, wechatSign);
    wx.ready(function () {
        //禁止分享功能
        // WeixinJSBridge.call('hideOptionMenu');
        wx.checkJsApi({
            jsApiList: [
                'openWXDeviceLib',
                'getWXDeviceTicket',
                'onMenuShareAppMessage',
                'onMenuShareTimeline',
                'onMenuShareQQ'
            ],
            success: function (res) {
                if (wxRes) {
                    $(".loading").hide();
                } else {
                    wxRes = true;
                }
                var content = {
                    title: '泰和美商城',
                    desc: '去商城逛逛吧',
                    link: 'http://wap.koudaitong.com/v2/showcase/homepage?alias=9c8qy9px',
                    imgUrl: 'http://' + document.domain + '/img/webshare.jpg'
                }
                shareAppMessage(content);
                shareTimeline(content);
                shareQQ(content)
            }
        });
        openWXDeviceLib();
    });

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

    //优睡ID选择器
    var TFSF = $("#timeFirst span:first");
    var TFSL = $("#timeFirst span:last");
    var TSSF = $("#timeSecond span:first");
    var TSSL = $("#timeSecond span:last");
    var TTSF = $("#timeThird span:first");
    var TTSL = $("#timeThird span:last");
    var TFS = $("#temperatureFirst span");
    var TSS = $("#temperatureSecond span");
    var TTS = $("#temperatureThird span");

    // 得到设备ID
    var device_id = getParameterByName('device_id');
    // 得到别名
    var alias = getParameterByName('alias');
    // 设置title
    document.title = "泰和美 " + alias;
    // 得到用户的token
    var access_token = getParameterByName('access_token');
    var wxDeviceId = getParameterByName('wx_device_id');
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
    // 测试环境注释
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
    var url = 'index.html?access_token=' + access_token + '&device_list=[]';//列表页面url
    // 得到设备的所有用户
    var users = getDeviceUser(device_id, requestHeader, userName, 1);
    // 得到设备主人信息
    var owner = _.find(users, function (user) {
        return user.role == 'owner'
    });
    // 如果设备没有主人，当前用户不是主人
    if (!owner || owner.username != userName) {
        // 获得用户属性
        var userProperty = getDeviceProperties(requestHeader, device_id, userName);
        //获得设备密码
        var password = getDeviceProperties(requestHeader, device_id, 'password');
        // 没有用户属性 或者用户属性为null  弹出密码框
        if (!userProperty || userProperty == 'null') {
            // 隐藏loading, 否则输入密码慢的话，可能会出现连接失败提示。
            // 等密码输入正确后，如果wxRes为false的话，重新显示loading并计时。
            $(".loading").hide();
            // 弹出密码框
            inputPwd();
            // 用户属性为0， 删除设备
        } else if (userProperty == '0') {
            // 弹出只有确定按钮的模态框
            modalInitializationOne(alias + '(' + device_id.split('/')[1] + ')已被主人删除!');
            $("#confirmButton").on('click', function () {
                setTimeout(function () {
                    // 设置用户属性为null，
                    // （本来应该在移除成功后设置，但是移除成功后 设备与用户解绑，接口调用无权限，解决方法，此处设置属性，移除失败的话再将属性改回去）
                    setDeviceProperties(requestHeader, device_id, userName, 'null');
                    //按确定之后 调用删除设备接口
                    getWxDeviceTicket(wxDeviceId, function (err, ticket) {
                        if (!!err) return;
                        unbindDevice(requestHeader, device_id, ticket, function (err, res) {
                            if (!err && res.result == "success") {
                                listFref('移除设备成功');
                            } else {
                                // 属性改回
                                setDeviceProperties(requestHeader, device_id, userName, '0');
                                listFref('移除设备失败');
                            }
                        });
                    });
                }, 1000);
            });
            return;
        }
    }
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
    // 优睡模态框的事件
    greateFineSleepModel();

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
                    getDeviceInfo(device_id);
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
    function getDeviceInfo(device_id, getESInfo) {
        $("#jumbotron").removeClass('offline_state');//移除设备状态灰色背景
        var deviceInfo = getDeviceProperties(requestHeader, device_id);
        console.log('deviceInfo', deviceInfo);
        var info = {};
        $.each(deviceInfo, function (i, _data) {
            info[_data.name] = _data.value;
        });
        if (getESInfo) {
            var esInfo1 = {"TIM1": "60", "TEMP1": "37"};
            var esInfo2 = {"TIM2": "180", "TEMP2": "36"};
            var esInfo3 = {"TIM3": "320", "TEMP3": "35"};

            if (_.has(info, 'esInfo1')) {
                esInfo1 = JSON.parse(info.esInfo1);
            }

            if (_.has(info, 'esInfo2')) {
                esInfo2 = JSON.parse(info.esInfo2);
            }

            if (_.has(info, 'esInfo3')) {
                esInfo3 = JSON.parse(info.esInfo3);
            }

            if (info.ES == "1") {
                $(".switch").prop({checked: true});//使用attr操纵checked会有问题
            } else if (info.ES == "0") {
                $(".switch").prop({checked: false});
            }

            temperatureFineSleepMode(esInfo1.TIM1, esInfo1.TEMP1, esInfo2.TIM2, esInfo2.TEMP2, esInfo3.TIM3, esInfo3.TEMP3);
        } else {
            if (info) {
                displayInfo(info);
            }
        }
    };
    /* 输入密码弹出框*/
    function inputPwd() {
        //模态框显示
        $("#inputPassWordModal").modal("show");

        var count = 0;
        $("#pwdCancel").on('click', function () {
            window.location.href = url;
        });
        $("#confirm").on("click", function () {
            var modifyContent = $("#modifyContent").val();
            console.log('modifyContent:', modifyContent);
            if (!modifyContent) {
                modalInitializationOne('密码不能为空');
            } else {
                if (modifyContent != password) {
                    count += 1;
                    if (count < 3) {
                        modalInitializationOne('密码错误');
                    } else {
                        modalInitializationOne('输入失败3次，将回到列表页面');
                        $("#confirmButton").on('click', function () {
                            //跳转到列表页面
                            window.location.href = url;
                        });
                    }
                } else {
                    if (!wxRes) {
                        $(".loading").show();
                        setTimeout(function () {
                            if ($(".loading").is(":visible")) {
                                modalInitializationOne("连接未成功，请重试...");
                            }
                        }, loadingTime);
                    }
                    // 密码正确，用户属性设置为1
                    setDeviceProperties(requestHeader, device_id, userName, '1');
                    //模态框隐藏
                    $("#inputPassWordModal").modal("hide");
                }
                //清除输入框内容
                $("#modifyContent").val('');
            }
        });
    }

    /* 设备离线样式 （上半部分显示成灰色） */
    function displayOffline() {
        $("#err").html('<span></span>' + "设备已离线");
        $("#jumbotron").addClass('offline_state');
    }

    /* 主控页面数据填充 */
    function displayInfo(info, type) {
        // 设备权限    
        //_.has()第二个参数在第一个参数（集合）中是否存在，存在返回true
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
            if (wxRes) {
                if (info.CT) {
                    $(".loading").hide();
                }
            } else {
                wxRes = true;
            }
            console.log(info.CT);
            var intCT = parseInt(info.CT);
            if (isNaN(intCT)) {
                intCT = "--";
            }
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

        // 精细睡眠
        if (_.has(info, "ES")) {
            console.log(((info.ES == '1') ? "精睡开启" : "精睡关闭"));
            var intES = parseInt(info.ES);
            onOffSwitch(intES, onFinesleep);
            onFinesleep.data("finesleep", intES);
        }

        //错误报警
        if (_.has(info, "ERR")) {
            var msg = errMsg;
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

    /* 设置温度减少,如果小于10则返回 */
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

    /* 设置温度增加 ，如果大于60则返回*/
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

    /* X秒内对调温按钮无操作则下发数据 */
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

    /* 下发温度 */
    function setTmp(tmp) {
        //下发温度
        var topic = device_id + '/in/';
        var commond = '{"ST":"' + tmp + '"}';
        client.publish(topic, commond);
    }

    /* 设置定时模式 */
    function setTimeMode() {
        $("#finalTime").mobiscroll().select({
            theme: 'mobiscroll',
            lang: 'zh',
            display: 'inline',
            minWidth: [260],
            maxWidth: [260],
            height: [25]
        });

        $("#finalTime_dummy").hide();
        $(".onOff_time").on('click', function () {
            $("#finalTimeModal").modal('show');
        });

        var showTime = "0";
        $('#finalTime').change(function () {
            showTime = $("#finalTime").get(0).selectedIndex;//获取预约option的下标
        });
        $("#confirmFooter #finalTimeButton").on('click', function () {
            var topic = device_id + '/in/';
            var commond = '{"FT":"' + showTime + '"}';
            client.publish(topic, commond);
            onOffSwitch(showTime, onOffTime);
            $("#finalTimeModal").modal('hide');
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

    /* 设置精细睡眠模式 */
    function setFineSleepMode(esInfo1, esInfo2, esInfo3) {
        var state = '0';
        if ($(".switch").prop('checked')) {
            state = '1';
        }
        setDeviceProperties(requestHeader, device_id, 'esInfo1', JSON.stringify(esInfo1));
        setDeviceProperties(requestHeader, device_id, 'esInfo2', JSON.stringify(esInfo2));
        setDeviceProperties(requestHeader, device_id, 'esInfo3', JSON.stringify(esInfo3));
        setDeviceProperties(requestHeader, device_id, 'ES', state);
        var topic = device_id + '/in/';
        command = _.extend({"ES": state}, esInfo1, esInfo2, esInfo3);
        console.log(command);
        client.publish(topic, JSON.stringify(command));
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

    function greateFineSleepModel() {
        //点击优睡 显示模态框
        $(".onOff_finesleep").click(function () {
            $("#finesleepModal").modal('show');
            getDeviceInfo(device_id, true);//从云端获取预约时间
            //生成iscroll
            myScroll = new IScroll('#wrapper', {
                click: false,
                vScroll: false,
                preventDefaultException: {tagName: /.*/}//不加词句将无法切换状态
            });
            //设置优睡弹出框中三个时间的值显示。
            setFineSleepTitle();
        });

        /* 当前时间的下拉菜单处于可见状态时隐藏其他时间*/
        $('#collapseOne').on({
            'shown.bs.collapse': function () {
                $('#collapseTitleTwo').hide();
                $('#collapseTitleThree').hide();
                $("#modalFooterBtn").hide();
            },
            'hidden.bs.collapse': function () {
                $('#collapseTitleTwo').show();
                $('#collapseTitleThree').show();
                $("#modalFooterBtn").show();
            }
        });


        $('#collapseTwo').on({
            'shown.bs.collapse': function () {
                $('#collapseTitleOne').slideUp("slow");
                $('#collapseTitleThree').hide();
                $("#modalFooterBtn").hide();
            },
            'hidden.bs.collapse': function () {
                $('#collapseTitleOne').slideDown("slow");
                $('#collapseTitleThree').show();
                $("#modalFooterBtn").show();
            }
        });


        $('#collapseThree').on({
            'shown.bs.collapse': function () {
                $('#collapseTitleOne').slideUp("slow");
                $('#collapseTitleTwo').slideUp("slow");
                $("#modalFooterBtn").hide();
            },
            'hidden.bs.collapse': function () {
                $('#collapseTitleOne').slideDown("slow");
                $('#collapseTitleTwo').slideDown("slow");
                $("#modalFooterBtn").show();
            }
        });
        //优睡参数发送
        $("#outBtn").on('click', function () {
            if ($(".switch").get(0).checked) {
                setSort();
                onOffSwitch("1", onFinesleep);
            } else {
                setSort();
                onOffSwitch('0', onFinesleep);
            }
            $("#finesleepModal").modal('hide');
        });

        //优睡开关
        $(".switch").on("change", function () {
            var intES = "0";
            if (!$(".switch").get(0).checked) {
                onFinesleep.data("finesleep", intES);
                $("#stateTitle").html("按“确定”发送").css('color', '#8fb9df');
                stateTitle();
            } else {
                intES = "1";
                onFinesleep.data("finesleep", intES);
                $("#stateTitle").html("按“确定”发送").css('color', '#f46652');
                stateTitle();
            }
        });
    }

    //2秒后提示消失
    var setStateTitle;

    function stateTitle() {
        clearTimeout(setStateTitle);
        setStateTitle = setTimeout(function () {
            $("#stateTitle").html("").css('color', '#f46652');
        }, 2000);
    }

    //排序并发送优睡参数
    function setSort(switchChecked) {
        var TIM1 = (parseInt(TFSF.text()) * 60 + parseInt(TFSL.text()));
        var TIM2 = (parseInt(TSSF.text()) * 60 + parseInt(TSSL.text()));
        var TIM3 = (parseInt(TTSF.text()) * 60 + parseInt(TTSL.text()));
        var TEMP1 = TFS.text();
        var TEMP2 = TSS.text();
        var TEMP3 = TTS.text();
        //排序
        var sortBy = [{"time": TIM1, "temp": TEMP1}, {"time": TIM2, "temp": TEMP2}, {"time": TIM3, "temp": TEMP3}];
        sortBy = _.sortBy(sortBy, 'time');
        var esInfo1 = {"TIM1": (sortBy[0].time).toString(), "TEMP1": sortBy[0].temp};
        var esInfo2 = {"TIM2": (sortBy[1].time).toString(), "TEMP2": sortBy[1].temp};
        var esInfo3 = {"TIM3": (sortBy[2].time).toString(), "TEMP3": sortBy[2].temp};
        temperatureFineSleepMode(esInfo1.TIM1, esInfo1.TEMP1, esInfo2.TIM2, esInfo2.TEMP2, esInfo3.TIM3, esInfo3.TEMP3);
        setFineSleepTitle();
        setFineSleepMode(esInfo1, esInfo2, esInfo3);
    }

    //设置优睡弹出框中三个时间的值显示。
    function setFineSleepTitle() {
        //温度 slider
        selectSleepTemperature($("#sliderOne"), TFS);
        selectSleepTemperature($("#sliderTwo"), TSS);
        selectSleepTemperature($("#sliderThree"), TTS);
        //时间选择
        selectSleepTime($('#select_hour_one'), TFSF);
        selectSleepTime($('#select_minute_one'), TFSL);
        selectSleepTime($('#select_hour_two'), TSSF);
        selectSleepTime($('#select_minute_two'), TSSL);
        selectSleepTime($('#select_hour_three'), TTSF);
        selectSleepTime($('#select_minute_three'), TTSL);
    }

    //选择优睡温度
    function selectSleepTemperature(sele, seleSpan) {
        sele.slider({
            min: 10,
            max: 60,
            value: parseInt(seleSpan.text()),
            tooltip: 'always'
        }).on("change", function (slideEvt) {
            seleSpan.text(slideEvt.value.newValue);
        });

    }

    //选择优睡时间
    function selectSleepTime(sele, seleSpan) {
        sele.get(0).selectedIndex = parseInt(seleSpan.text());
        sele.mobiscroll().select({
            theme: 'mobiscroll',
            lang: 'zh',
            display: 'inline',
            minWidth: [95],
            maxWidth: [100],
            height: [25]
        }).on('change', function () {
            seleSpan.text(sele.get(0).selectedIndex);
        });
    }

    //初始化优睡弹出框
    function temperatureFineSleepMode(TIM1, TEMP1, TIM2, TEMP2, TIM3, TEMP3) {
        TFSF.text(parseInt(TIM1 / 60));
        TFSL.text(parseInt(TIM1 * 60 % 3600 / 60));
        TSSF.text(parseInt(TIM2 / 60));
        TSSL.text(parseInt(TIM2 * 60 % 3600 / 60));
        TTSF.text(parseInt(TIM3 / 60));
        TTSL.text(parseInt(TIM3 * 60 % 3600 / 60));
        TFS.text(TEMP1);
        TSS.text(TEMP2);
        TTS.text(TEMP3);
    }

    function listFref(title) {
        modalInitializationOne(title);
        $("#confirmButton").on('click', function () {
            //跳转到列表页面
            window.location.href = url;
        });
    }
})
