/**
 * Created by CJLIU on 2015/9/19.
 */
$(document).ready(function () {
    language('lang/');
    // 测试环境注释
    $(".loading").show();
    //当前设备ID
    var thisDeviceId;
    // 得到请求的sign
    var requestSign = getRequestSign();
    // 得到用户的token
    var access_token = getParameterByName('access_token');
    // 设置庆科云api请求头部参数（V1 只需要Authorization）
    var requestHeader = {
        'Authorization': 'token ' + access_token,
        'X-Application-Id': appId,
        'X-Request-Sign': requestSign
    };
    // 得到微信openID
    var userName = getUserName(access_token, requestHeader);

    //微信jssdk配置 正式需打开
    var signInfo = getWechatSignInfo();
    var wechatSign = getWechatSign(signInfo);
    wechatConfig(signInfo, wechatSign);
    wx.ready(function () {
      //禁止分享功能
      //WeixinJSBridge.call('hideOptionMenu');
      wx.checkJsApi({
          jsApiList: [
              'openWXDeviceLib',
              'getWXDeviceTicket',
              'onMenuShareAppMessage',
              'onMenuShareTimeline',
              'onMenuShareQQ'
          ],
          success: function (res) {
              $(".loading").hide();
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

    // 得到庆科返回的deviceLists
    var deviceLists = getParameterByName('device_list');
    if (deviceLists !== null) {
        // 初始化列表页面
        initPage();
        // 自动刷新列表
        autoReloadPage();
    } else {
//      alert('设备未找到页面');
        $("#noDevice").show();
        $("#footer").hide();
    }

    /* 初始化列表 */
    function initPage() {
        getDevices(requestHeader, function (err, data) {
            if (!!err) {
                console.error(data);
                return;
            }
            if (_.size(data) == 0) {
                $("#noDevice").show();
                $("#footer").hide();
            }
            $.each(data, function (i, _data) {
                var device_id = _data.id;
                var product_id = device_id.split('/')[0];
                var bssid = _data.bssid;
                var alias = !!_data.alias ? _data.alias : "TH-1507";
                var wxDevice_id = _data.wx_device_id;
                var url = product_id+'.html?device_id=' + device_id + '&access_token=' + access_token + '&wx_device_id=' + wxDevice_id + '&alias=' + alias;
                var state = _data.online;
                //渲染设备列表
                addDeviceLists(state, alias, url, device_id, bssid, wxDevice_id);
            });
            onManageDevice();
            onRemoveDevice();
            onModifyName();
            onPermission();
            onShareDevice();
        })
    }

    /* 自动刷新列表 */
    function autoReloadPage() {
        // 初始刷新列表次数
        var reloadTimers = 0;
        var reloadTimer = setInterval(function () {
            reloadTimers++;
            reloadPage();
            if (reloadTimers == maxReloadTimers) {
                clearInterval(reloadTimer);
            }
        }, reloadInterval);
    }

    /* 刷新列表 */
    function reloadPage() {
        getDevices(requestHeader, function (err, data) {
            if (!!err) {
                console.error(data);
                return;
            }
            console.log(data);
            $.each(data, function (i, _data) {
                var device_id = _data.id;
                var product_id = device_id.split('/')[0];
                var bssid = _data.bssid;
                var alias = !!_data.alias ? _data.alias : "TH-1507";
                var wxDevice_id = _data.wx_device_id;
                var url = product_id+'.html?device_id=' + device_id + '&access_token=' + access_token + '&wx_device_id=' + wxDevice_id + '&alias=' + alias;
                var state = _data.online;

                //渲染设备列表
                reloadPageLists(state, alias, bssid, url, device_id);
            });
        })
    }

    /* 添加修改名称的click事件 */
    function onModifyName() {
        $(".modifyName").on("click", function (e) {
            //模态框显示
            $("#inputModal").modal("show");
            //样式改了之后，这里可能有问题
            thisDeviceId = $(this).parents('.alert')[0].id;
        });

        $("#confirm").on("click", function () {
            var modifyContent = $("#modifyContent").val();
            console.log('modifyContent:', modifyContent);
            if (!modifyContent) {
                // modalInitializationOne('写点什么吧');
                modalInitializationOne("<span data-i18n='WRITE'>Write something about it</span>");
            } else if (getByteLen(modifyContent) > 16) {
                // modalInitializationOne('超过字数咯');
                modalInitializationOne("<span data-i18n='MORE'>More than words</span>");
            } else {
                modifyDeviceAlias(requestHeader, thisDeviceId, modifyContent, function (err) {
                    if (!!err) {
                        // modalInitializationOne('修改名称失败');
                        modalInitializationOne("<span data-i18n='ENAME_FAIL'>Failed to edit name</span>");
                        return;
                    }
                    thisDeviceId = thisDeviceId.replace(/\//g, "\\\/");
                    $("#" + thisDeviceId + " #alias").html(modifyContent);
                })
                //模态框隐藏
                $("#inputModal").modal("hide");
                //清除输入框内容
                $("#modifyContent").val('');
            }
        });
    }

    /* 设备管理 */
    function onManageDevice() {
        $(".collapse").on('show.bs.collapse', function () {
            thisDeviceId = $(this).parents('.alert')[0].id;
            var role = getDeviceUser(thisDeviceId, requestHeader, userName);
            var deviceControl = getDeviceProperties(requestHeader, thisDeviceId, 'deviceControl');
            console.log("role =" + role);
            // 设备主人
            if (role == "owner") {
                //按钮 4个 （移除 修改 用户管理 设备分享）
                for (var i = 0; i < 4; i++) {
                    $(this).find(".btn-group").eq(i).removeClass('disabled');
                }
            } else if (role == "share") {
                // 用户有权限
                if (!deviceControl || deviceControl == 1) {
                    //按钮2个 移除 修改
                    $(this).find(".btn-group").eq(0).removeClass('disabled');
                    $(this).find(".btn-group").eq(1).removeClass('disabled');
                } else {
                    //按钮1个 移除
                    $(this).find(".btn-group").eq(0).removeClass('disabled');
                }
            }
        });
        $(".setUp").on("click", function () {
            $(this).next().children("#setUpContent").collapse('toggle');
        })
    }

    /* 移除设备 */
    function onRemoveDevice() {
        $(".removeDevice").on("click", function () {
            thisDeviceId = $(this).parents('.alert')[0].id;
            // modalInitializationTwo('真的要移除设备吗？');
            modalInitializationTwo("<span data-i18n='DEL_DEVICE'>Do you really want to remove the device?</span>");
            $("#confirmButton").on('click', function () {
                // 获取设备的用户
                var users = getDeviceUser(thisDeviceId, requestHeader, userName, 1);
                // 获取设备主任信息
                var owner = _.find(users, function (_role) {
                    return _role.role == 'owner'
                })
                // （以下部分内容应该在移除成功后设置，但是移除成功后 设备与用户解绑，接口调用无权限，解决方法，此处设置属性，移除失败的话再将属性改回去）
                // 保存旧密码以及旧的属性
                var oldProperty = {};
                var oldPassword;
                // 如果移除设备的用户是设备的主人
                if (!!owner && owner.username == userName) {
                    oldPassword = getDeviceProperties(requestHeader, thisDeviceId, 'password');
                    // 修改设备的密码
                    var password = getRandomStr(6);
                    setDeviceProperties(requestHeader, thisDeviceId, 'password', password);

                    // 将设备的用户标识设置为0 （需删除）
                    users.forEach(function (_role) {
                        if (_role.username != userName) {
                            oldProperty[_role.username] = getDeviceProperties(requestHeader, thisDeviceId, _role.username);
                            setDeviceProperties(requestHeader, thisDeviceId, _role.username, '0');
                        }
                    })
                } else {
                    // 用户移除设备，将用户属性设置为 null
                    oldProperty[userName] = getDeviceProperties(requestHeader, thisDeviceId, userName);
                    setDeviceProperties(requestHeader, thisDeviceId, userName, 'null');
                }

                var deviceId = thisDeviceId.replace(/\//g, "\\\/");
                var wxDeviceId = $("#" + deviceId).data('wxdeviceid');
                $("#confirmModal").modal('hide');
                getWxDeviceTicket(wxDeviceId, function (err, ticket) {
                    if (!!err) return;
                    unbindDevice(requestHeader, thisDeviceId, ticket, function (err, res) {
                        if (!err && res.result == "success") {
                            // modalInitializationOne('移除设备成功');
                            modalInitializationOne("<span data-i18n='DEL_DEVICE_SUCCESS'>Remove device success</span>");
                            $("#" + deviceId).remove();
                        } else {
                            // 还原设置
                            if (!!owner && owner.username == userName) {
                                if (!!oldPassword) {
                                    setDeviceProperties(requestHeader, thisDeviceId, 'password', oldPassword);
                                }
                                // 将设备的用户标识设置为0 可删除
                                users.forEach(function (_role) {
                                    if (_role.username != userName) {
                                        console.log(oldProperty[_role.username]);
                                        setDeviceProperties(requestHeader, thisDeviceId, _role.username, oldProperty[_role.username]);
                                    }
                                })
                            } else {
                                console.log(oldProperty[userName]);
                                setDeviceProperties(requestHeader, thisDeviceId, userName, oldProperty[userName]);
                            }
                            // modalInitializationOne('移除设备失败');
                            modalInitializationOne("<span data-i18n='DEL_DEVICE_FAIL'>Remove device failed</span>");
                        }
                    });
                });
            });
        })
    }

    /* 设备分享 */
    function onShareDevice() {
        $(".share").on("click", function () {
            //样式改了之后，这里可能有问题
            thisDeviceId = $(this).parents('.alert')[0].id;
            var name = $(this).parents('.alert').find("#alias").text();
            var MAC = $(this).parents('.alert').find("#bssid").text();
            var desc = "(" + name + "/" + MAC + ")" + "已被分享，快来点击";

            // 获取设备密码
            var password = getDeviceProperties(requestHeader, thisDeviceId, 'password');
            // 如果没有设备密码，创建
            if (!password) {
                password = getRandomStr(6);
                setDeviceProperties(requestHeader, thisDeviceId, 'password', password);
                console.log(password);
            }

            var _requestHeader = {
                'Authorization': 'token ' + devAccessToken
            };
            var ticket = getDeviceQrcode(_requestHeader, thisDeviceId);
            //alert('分享URL: ' + 'http://' + document.domain + '/shareDevice.html?ticket=' + ticket + '&pwd=' + password);
            var content = {
                title: '设备分享',
                desc: desc,
                link: 'http://' + document.domain + '/shareDevice.html?pwd=' + password + '&ticket=' + ticket,
                imgUrl: 'http://' + document.domain + '/img/share.jpg'
            }
            // 显示引导页面
            var showGuide = function () {
                $("#shareModal").modal('show')
            };
            // 隐藏引导页面
            var hideGuide = function () {
                $("#shareModal").modal('hide')
            };
            shareAppMessage(content, showGuide, hideGuide);
            var content = {
                title: '泰和美商城',
                desc: '去商城逛逛吧',
                link: 'http://wap.koudaitong.com/v2/showcase/homepage?alias=9c8qy9px',
                imgUrl: 'http://' + document.domain + '/img/webshare.jpg'
            };
            shareTimeline(content, hideGuide);
            shareQQ(content, hideGuide);
        })
    }

    /* 用户权限管理 */
    function onPermission() {
        var pmChecked = $("#pmChecked");
        $(".permission").on("click", function () {
            thisDeviceId = $(this).parents('.fade')[0].id;
            var deviceControl = getDeviceProperties(requestHeader, thisDeviceId, 'deviceControl');
            console.log('deviceControl:', deviceControl);
            $("#permissionModal").modal('show');
            if (!!deviceControl && deviceControl == 0) {
                pmChecked.attr('checked', false);
            } else {
                pmChecked.attr('checked', 'true');
            }
        });
        pmChecked.on('change', function () {
            var permissionSwitch = 1;
            if (!$(this)[0].checked) {
                permissionSwitch = 0;
            }
            console.log('权限开关:', permissionSwitch);
            setPermission(thisDeviceId, permissionSwitch)
        })
    }

    /* 设置用户权限 是否允许控制 */
    function setPermission(thisDeviceId, permissionSwitch) {
        setDeviceProperties(requestHeader, thisDeviceId, 'deviceControl', permissionSwitch);
    }

    /**
     * 渲染设备列表
     * @param device_id
     * @param state
     * @param alias
     * @param bssid
     * @param url
     */
    function addDeviceLists(state, alias, url, device_id, bssid, wxDeviceId) {
        //填充列表
        var template = $("#listTemp").html();
        var list = $("<div id='" + device_id + "' data-wxDeviceId='" + wxDeviceId + "' class='alert fade in'>");
        list.html(template);
        if (state == 0) {
            state = "离线";
            $(list).removeClass("row-online-state");
            addDeviceListsData(list, state, alias, bssid);
            // addDeviceListsData(list, state, alias, bssid, url, wxDeviceId);
        } else {
            state = "在线";
            $(list).addClass("row-online-state");
            addDeviceListsData(list, state, alias, bssid, url, wxDeviceId);
        }
    }

    function addDeviceListsData(divName, state, alias, bssid, url) {
        var equipmentName;
        $(divName).off();//此处必须先初始化所有事件，否则在之后每次刷新状态进入此方法会出问题
        $(divName).on('click', function (e) {
            if ($(e.target).attr('id') == "alias" || $(e.target).attr('id') == "bssid") {
                $(e.target).parents('.alert').addClass('row-online-state-bg');
                equipmentName = $(e.target).parents('.alert').find('ul #alias').text();
                setTimeout(function () {
                    $(e.target).parents('.alert').removeClass('row-online-state-bg');
                }, 200);
                console.log(equipmentName);
                if(url != undefined){
                    setTimeout(function () {
                        var equipmentUrl = url.split("alias=")[0];
                        window.location.href = equipmentUrl + "alias=" + equipmentName;
                    }, 300);
                }else{
                }
            }
        });
        $(divName).find("#state").text(state);
        $(divName).find("#alias").text(alias);
        $(divName).find("#bssid").text(bssid);
        $("#list").append(divName);
    }

    /**
     * 刷新后渲染设备列表
     * @param device_id
     * @param state
     * @param alias
     * @param bssid
     * @param url
     */
    function reloadPageLists(state, alias, bssid, url, device_id) {
        var deviceID = device_id.replace(/\//g, "\\\/");
        var list = $("#" + deviceID);
        if (state == 0) {
            state = "离线";
            $(list).removeClass("row-online-state");
            addDeviceListsData(list, state, alias, bssid);
            // addDeviceListsData(list, state, alias, bssid, url);
            	
        } else {
            state = "在线";
            $(list).addClass("row-online-state");
            addDeviceListsData(list, state, alias, bssid, url);
        }
        list.find("#state").text(state);
        list.find("#alias").text(alias);
    }
});
