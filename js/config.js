/**
 * Created by CJLIU on 2015/10/16.
 */

var appId = 'f31b460a-8a8d-4ffc-97c1-054a8c4b27cf';
var appKey = 'b7d892afa90fa5be97e424e0c6d70a2e';
var devAccessToken = 'f60459b2-9542-4980-8fbc-c6f8737aecf1';
// 测试环境
// var appId = '97256c69-6723-43fb-87dc-167eaf9dc501';
// var appKey = 'f98d773200d3c8e15a52f972656dd4df';

//自动刷新列表间隔时间
var reloadInterval = 2000;
// 刷新列表次数
var maxReloadTimers = 5;

// 设备主控页面所需
//用于loading时X秒内未链接则弹出提示
var loadingTime = 20000;
//用于调温按钮X秒内无操作则上发数据
var setTimer = 2000;
