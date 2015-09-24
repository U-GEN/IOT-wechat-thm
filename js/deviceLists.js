/**
 * Created by CJLIU on 2015/9/19.
 */
$(document).ready(function () {
    var thisDeviceId;
    var access_token = getParameterByName('access_token');
    //初始化设备列表
    var deviceLists = getParameterByName('device_list');
    if (deviceLists !== null) {
        try {
            deviceLists = JSON.parse(deviceLists);
            for (var i in deviceLists) {
                var device = deviceLists[i];
                if (device[0] === null) continue;
                var device_id = device[0];
                var bssid = device_id.split('/')[1];
                var alias = device[3] ? device[3] : device[0];
                var product_id = device_id.split('/')[0];
                //var time = new Date(parseInt(device[1])*1000).toLocaleString();
                //var url = product_id + '.html?device_id=' + device_id + '&access_token=' + access_token + '&alias=' + alias;
                var url = 'device.html?device_id=' + device_id + '&access_token=' + access_token + '&alias=' + alias;
                var state = device[2];
                //渲染设备列表
                addDeviceLists(device_id, state, alias, bssid, url);
            }
        } catch (e) {
            alert(e);
        }
    }

    /* 刷新列表 */
    $("#reloadPage").click(function () {
        $.ajax({
            type: "POST",
            url: "http://api.easylink.io/v1/device/devices",
            //dataType: "json",
            headers: {
                "AUTHORIZATION": "token " + access_token
            },
            success: function (data) {
                console.log(data);
                $.each(data, function (i, _data) {
                    var device_id = _data.id;
                    var product_id = device_id.split('/')[0];
                    var bssid = _data.bssid;
                    var alias = _data.alias;
                    //var url = product_id + '.html?device_id=' + device_id + '&access_token=' + access_token + '&alias=' + alias;
                    var url = 'device.html?device_id=' + device_id + '&access_token=' + access_token + '&alias=' + alias;
                    var state = _data.online;
                    //移除设备列表
                    $("#list").children().remove();
                    //渲染设备列表
                    addDeviceLists(device_id, state, alias, bssid, url);
                    //移除修改名称click事件
                    offModifyName();
                    //添加修改名称click事件
                    onModifyName();
                });
            },
            error: function (data) {
                //alert("修改名称失败");
                console.log(data);
            }
        });
    });

    /* 修改名称 */
    onModifyName();
    $("#confirm").on("click", function () {
        var modifyContent = $("#modifyContent").val();
        if (!modifyContent) {
            alert('写点什么吧');
        } else if (getByteLen(modifyContent) > 10) {
            alert('超过字数咯');
        } else {
//      	alert(thisDeviceId);
            $.ajax({
                type: "POST",
                url: "http://api.easylink.io/v1/device/modify",
                data: {
                    "device_id": thisDeviceId,
                    "alias": modifyContent
                },
                headers: {
                    "AUTHORIZATION": "token " + access_token
                },
                success: function () {
                    $("#alias").html(modifyContent);
                },
                error: function (data) {
                    alert("修改名称失败");
                    console.log(data);
                }
            });
            //模态框隐藏
            $("#inputModal").modal("hide");
            //清除输入框内容
            $("#modifyContent").val('');
        }
    });

    /* 添加修改名称的click事件 */
    function onModifyName() {
        $(".modifyName").on("click", function () {
            //模态框显示
            $("#inputModal").modal("show");
            thisDeviceId = $(this).parents()[2].id;
        });
    }

    /* 移除修改名称的click事件 */
    function offModifyName() {
        $(".modifyName").off("click");
    }

    /**
     * 渲染设备列表
     * @param device_id
     * @param state
     * @param alias
     * @param bssid
     * @param url
     */
    function addDeviceLists(device_id, state, alias, bssid, url) {
        //填充列表
        var template = $("#listTemp").html();
        var list = $("<div id='" + device_id + "'>");
        list.html(template);
        if (state == 0) {
            state = "离线";
            addDeviceListsData(list,"#list","",state, alias, bssid, "javascript:void(0);");
        } else {
            state = "在线";
            addDeviceListsData(list,"#list","row-online-state",state, alias, bssid, url);
        }    
    }
    function addDeviceListsData(divName,FName,className,state, alias, bssid, url){
    	$(divName).addClass(className);
    	$(divName).on('touchstart click',function(e){
			if($(e.target).attr('id')!="selectDevice")
			{
				window.location.href=url;
			}
    	});
//      $(divName).find("a").attr("href", url);
        $(divName).find("#state").text(state);
        $(divName).find("#alias").text(alias);
        $(divName).find("#bssid").text(bssid);
        $(FName).append(divName);
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

});

