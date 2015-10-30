/**
 * Created by UGEN75 on 2015/10/16.
 */

/**
 * 得到微信openID
 * @param access_token
 * @param requestHeader
 */
function getUserName(access_token, requestHeader) {
    var uname = "";
    $.ajax({
        type: "POST",
        async: false,
        url: "http://api.easylink.io/v1/key/info",
        data: {
            "token": access_token
        },
        headers: requestHeader,
        success: function (data) {
            uname = data[0].username;
        },
        error: function (data) {
            console.log(data);
        }
    });
    console.log('userName: ', uname);
    return uname;
}

/**
 * 得到微信access_token
 * @param requestHeader
 * @returns {string}
 */
function getWechatAccessToken(requestHeader) {
    var accessToken;
    $.ajax({
        type: "GET",
        async: false,
        url: "http://api.easylink.io/v2/wechat/access_token",
        data: {
            "app_id": appId
        },
        headers: requestHeader,
        success: function (data) {
            accessToken = data.access_token;
        },
        error: function (data) {
            console.log(data);
        }
    });
    console.log('accessToken:', accessToken);
    if (!!accessToken) {
        return accessToken;
    }

}

/**
 * 得到用户所有设备的相关信息
 * @param requestHeader
 * @param callback
 */
function getDevices(requestHeader, callback) {
    $.ajax({
        type: "POST",
        url: "http://api.easylink.io/v1/device/devices",
        headers: requestHeader,
        success: function (data) {
            callback(null, data);
        },
        error: function (data) {
            callback(data, null);
        }
    });
}

/**
 * 修改设备别名
 * @param requestHeader
 * @param deviceId
 * @param alias
 * @param callback
 */
function modifyDeviceAlias(requestHeader, deviceId, alias, callback) {
    $.ajax({
        type: "POST",
        url: "http://api.easylink.io/v1/device/modify",
        data: {
            "device_id": deviceId,
            "alias": alias
        },
        headers: requestHeader,
        success: function () {
            callback(null);
        },
        error: function (data) {
            callback(data);
        }
    });
}

/**
 * 得到设备的用户
 * @param deviceId
 * @param requestHeader
 * @param userName
 * @param type type=1时，返回用户列表，否则返回用户权限
 * @returns {*}
 */
function getDeviceUser(deviceId, requestHeader, userName, type) {
    var user;
    $.ajax({
        type: "GET",
        async: false,
        url: "http://api.easylink.io/v2/devices/users",
        data: {
            "device_id": deviceId
        },
        headers: requestHeader,
        success: function (data) {
            console.log(data);
            if (type == 1) {
                user = data;
            } else {
                user = (_.find(data, function (_data) {
                    return _data.username == userName
                })).role;
            }

        },
        error: function (data) {
            if (type == 'role') {
                user = 'share'
            }
            console.log(data);
        }
    });
    console.log('user: ', user);
    return user;
}

/**
 * 得到设备的自定义属性
 * @param deviceId
 * @param requestHeader
 * @param property
 */
function getDeviceProperties(requestHeader, deviceId, property) {
    var properties;
    $.ajax({
        type: "GET",
        async: false,
        url: "http://api.easylink.io/v2/devices/properties",
        data: {
            "device_id": deviceId
        },
        headers: requestHeader,
        success: function (data) {
            if (!property) {
                properties = data;
            } else {
                properties = _.find(data, function (_data) {
                    return _data.name == property
                });
                if (!!properties) {
                    properties = properties.value;
                }

            }

        },
        error: function (data) {
            console.log(data);
        }
    });
    if (!!properties) {
        return properties;
    }
}

function setDeviceProperties(requestHeader, deviceId, property, value) {
    $.ajax({
        type: "POST",
        url: "http://api.easylink.io/v2/devices/properties",
        data: {
            "device_id": deviceId,
            "name": property,
            "value": value
        },
        headers: requestHeader,
        success: function (data) {
            console.log(data);
        },
        error: function (data) {
            console.log(data);
        }
    });
}
/**
 * 解绑设备
 * @param requestHeader
 * @param deviceId
 * @param ticket 由wxJS获得的deviceTicket
 * @param callback
 */
function unbindDevice(requestHeader, deviceId, ticket, callback) {
    $.ajax({
        type: "POST",
        async: true,
        url: "http://api.easylink.io/v2/wechat/device/unbind",
        data: {
            "ticket": ticket,
            "app_id": appId,
            "device_id": deviceId
        },
        headers: requestHeader,
        success: function (data) {
            //alert('unbind:' + JSON.stringify(data));
            callback(null, data);
        },
        error: function (data) {
            //alert('unbind:' + JSON.stringify(data));
            callback("err", null);
        }
    });

}

/**
 * 得到设备二维码
 * @param requestHeader
 * @param deviceId
 * @returns {*}
 */
function getDeviceQrcode(requestHeader, deviceId) {
    var product_id = deviceId.split('/')[0];
    var mac = deviceId.split('/')[1];
    var ticket;
    $.ajax({
        type: "POST",
        async: false,
        url: "http://api.easylink.io/v1/wechat/device/create",
        data: {
            "product_id": product_id,
            'app_id': appId,
            'mac': mac
        },
        headers: requestHeader,
        success: function (data) {
            ticket = data[mac].ticket;
        },
        error: function (data) {
            alert(JSON.stringify(data));
        }
    })
    if (!!ticket) {
        return ticket;
    }
}

/**
 * 从庆科获得微信签名信息
 * @returns {string}
 */
function getWechatSignInfo() {
    var signInfo = "";
    $.ajax({
        type: "GET",
        async: false,
        url: "http://" + appId + ".app.easylink.io/sign.php",
        //data: {"device_id": deviceId},
        headers: {},
        cache: false,
        dataType: 'json',
        success: function (data) {
            console.log(data);
            signInfo = data;
        },
        error: function (data) {
            console.log(data);
        }
    });
    //alert('signInfo: '+signInfo);
    if (!!signInfo) {
        return signInfo;
    }
}

/**
 * 得到微信签名
 * @param signInfo 从庆科获得微信签名信息
 * @returns {*}
 */
function getWechatSign(signInfo) {
    var nonceStr = signInfo.nonceStr;
    var timestamp = signInfo.timestamp;
    var ticket = signInfo.jsapiTicket;
    var url = document.location.href.split('#')[0];
    var rawString = 'jsapi_ticket=' + ticket + '&noncestr=' + nonceStr + '&timestamp=' + timestamp + '&url=' + url;
    var sign = hex_sha1(rawString);
    //alert('sign: ' + sign);
    return sign;
}

/**
 * 使用wxJS 配置
 * @param signInfo
 * @param wechatSign
 */
function wechatConfig(signInfo, wechatSign) {
    wx.config({
        debug: false, // 开启调试模式,调用的所有api的返回值会在客户端alert出来，若要查看传入的参数，可以在pc端打开，参数信息会通过log打出，仅在pc端时才会打印。
        appId: signInfo.appId, // 必填，公众号的唯一标识
        timestamp: signInfo.timestamp, // 必填，生成签名的时间戳
        nonceStr: signInfo.nonceStr, // 必填，生成签名的随机串
        signature: wechatSign, // 必填，签名，见附录1
        jsApiList: [
            // 必填，需要使用的JS接口列表，所有JS接口列表见附录2
            'openWXDeviceLib',
            'getWXDeviceTicket',
            'onMenuShareAppMessage',
            'onMenuShareTimeline',
            'onMenuShareQQ'
        ]
    });
}
/**
 * 通过wxJsapi初始化设备库
 */
function openWXDeviceLib() {
    WeixinJSBridge.invoke('openWXDeviceLib', {}, function (res) {
        //alert("wx.openWXDeviceLib " + JSON.stringify(res));
    });
}

/**
 * 通过wxJsapi得到微信设备的ticket（获取操作凭证）
 * @param deviceId
 * @param callback
 */
function getWxDeviceTicket(deviceId, callback) {
    WeixinJSBridge.invoke('getWXDeviceTicket', {
        'deviceId': deviceId,
        'type': '2'
    }, function (res) {
        if (res.err_msg == 'getWXDeviceTicket:ok') {
            var ticket = res.ticket;
            //alert('ticket: ' + ticket);
            callback(null, ticket);
        } else {
            callback('err', null);
            console.log(JSON.stringify(res));
        }
    });
}

/**
 * 获取“分享给朋友”按钮点击状态及自定义分享内容接口
 * @param ticket
 */
function shareAppMessage(content, showGuide, hideGuide) {
    wx.onMenuShareAppMessage({
        title: content.title,
        desc: content.desc,
        link: content.link,
        imgUrl: content.imgUrl,
        trigger: function (res) {
            if(!!hideGuide){
                hideGuide();
            }
            // 不要尝试在trigger中使用ajax异步请求修改本次分享的内容，因为客户端分享操作是一个同步操作，这时候使用ajax的回包会还没有返回
            //alert('用户点击发送给朋友:' + JSON.stringify(res));
        },
        success: function (res) {
            // hideGuide();
        },
        cancel: function (res) {
            // hideGuide();
        },
        fail: function (res) {
            alert(JSON.stringify(res));
        }
    });
    if(!!showGuide){
        showGuide();
    }
}

/**
 * 获取“分享朋友圈”按钮点击状态及自定义分享内容接口
 * @param ticket
 */
function shareTimeline(content, hideGuide){
    wx.onMenuShareTimeline({
        title: content.title,
        link: content.link,
        imgUrl: content.imgUrl,
        success: function () {
            // 用户确认分享后执行的回调函数
            if(!!hideGuide){
                hideGuide();
            }
        },
        cancel: function () {
            // 用户取消分享后执行的回调函数
            if(!!hideGuide){
                hideGuide();
            }
        }
    });
}

/**
 * 获取“分享给QQ”按钮点击状态及自定义分享内容接口
 * @param ticket
 */
function shareQQ (content, hideGuide){
    wx.onMenuShareQQ({
        title: content.title,
        desc: content.desc,
        link: content.link,
        imgUrl: content.imgUrl,
        success: function () { 
            if(!!hideGuide){
                hideGuide();
            }
        },
        cancel: function () { 
            if(!!hideGuide){
                hideGuide();
            }
        }
    });
}

/**
 * 获取“分享腾讯微博”按钮点击状态及自定义分享内容接口
 * @param ticket
 */
function shareWeibo(){
    wx.onMenuShareWeibo({
        title: content.title,
        desc: content.desc,
        link: content.link,
        imgUrl: content.imgUrl,
        success: function () { 
            if(!!hideGuide){
                hideGuide();
            }
        },
        cancel: function () { 
            if(!!hideGuide){
                hideGuide();
            }
        }
    });
}

/**
 * 获取“分享给QQ空间”按钮点击状态及自定义分享内容接口
 * @param ticket
 */
function shareQZone(){
    wx.onMenuShareQZone({
        title: content.title,
        desc: content.desc,
        link: content.link,
        imgUrl: content.imgUrl,
        success: function () { 
            if(!!hideGuide){
                hideGuide();
            }
        },
        cancel: function () { 
            if(!!hideGuide){
                hideGuide();
            }
        }
    });
}

/**
 * 返回庆科云API请求的签名
 */
function getRequestSign() {
    var now = Math.round(new Date().getTime() / 1000);
    var sign = $.md5(appKey + now);
    return sign + ", " + now;
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
 * 返回字符的字节长度（汉字算2个字节）
 * @param val
 * @returns {number}
 */
var getByteLen = function (val) {
    var len = 0;
    for (var i = 0; i < val.length; i++) {
        if (val[i].match(/[^x00-xff]/ig) != null) //全角
            len += 2;
        else
            len += 1;
    }
    ;
    return len;
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

/* 弹出框双选择初始化*/
function modalInitializationTwo(confirmTxt){
    $("#confirmTxt").html(confirmTxt);
    $("#cancelButton").show();
    $("#confirmButton").off();//移除所有绑定事件
    $("#confirmModal").modal('show');
}
/* 弹出框单选择初始化*/
function modalInitializationOne(confirmTxt){
    $("#confirmTxt").html(confirmTxt);
    $("#cancelButton").hide();
    $("#confirmButton").off();//移除所有绑定事件
    $("#confirmModal").modal('show');
    $("#confirmButton").on('click',function(){
        $("#confirmModal").modal('hide');
    });
}