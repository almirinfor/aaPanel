

var site = {
    get_list: function (page, search, type) {
        if (page == undefined) page = 1;
        if (type == '-1' || type == undefined) {
            type = $('.site_type select').val();
        }
        bt.site.get_list(page, search, type, function (rdata) {
            $('.dataTables_paginate').html(rdata.page);
                var data = rdata.data;
                var _tab = bt.render({
                    table: '#webBody',
                    columns: [
                        { field: 'id', type: 'checkbox', width: 30 },
                        {
                            field: 'name', title: lan.site.site_name, width: 150, templet: function (item) {
                                return '<a class="btlink webtips" onclick="site.web_edit(this)" href="javascript:;">' + item.name + '</a>';
                            }, sort: function () { site.get_list(); }
                        },
                        {
                            field: 'status', title: lan.site.status, width: 98, templet: function (item) {
                                var _status = '<a href="javascript:;" ';
                                if (item.status == '1' || item.status == lan.site.normal || item.status == lan.site.running) {
                                    _status += ' onclick="bt.site.stop(' + item.id + ',\'' + item.name + '\') " >';
                                    _status += '<span style="color:#5CB85C">'+lan.site.running_text+' </span><span style="color:#5CB85C" class="glyphicon glyphicon-play"></span>';
                                }
                                else {
                                    _status += ' onclick="bt.site.start(' + item.id + ',\'' + item.name + '\')"';
                                    _status += '<span style="color:red">'+lan.site.stopped+'  </span><span style="color:red" class="glyphicon glyphicon-pause"></span>';
                                }
                                return _status;
                            }, sort: function () { site.get_list(); }
                        },
                        {
                            field: 'backup', title: lan.site.backup, width: 105, templet: function (item) {
                                var backup = lan.site.backup_no;
                                if (item.backup_count > 0) backup = lan.site.backup_yes;
                                return '<a href="javascript:;" class="btlink" onclick="site.site_detail(' + item.id + ',\'' + item.name + '\')">' + backup + '</a>';
                            }
                        },
                        {
                            field: 'path', title: lan.site.root_dir, width: '26%', templet: function (item) {
                                var _path = bt.format_path(item.path);
                                return '<a class="btlink" title="'+lan.site.open_dir+'" href="javascript:openPath(\'' + _path + '\');">' + _path + '</a>';
                            }
                        },
                        {
                            field: 'edate', title: lan.site.endtime, width: 125, templet: function (item) {
                                var _endtime = '';
                                if (item.edate) _endtime = item.edate;
                                if (item.endtime) _endtime = item.endtime;
                                _endtime = (_endtime == "0000-00-00") ? lan.site.web_end_time : _endtime
                                return '<a class="btlink setTimes" id="site_endtime_' + item.id + '" >' + _endtime + '</a>';
                            },
                            sort: function () { site.get_list(); }
                        },
                        {
                            field: 'ps', title: lan.site.note, templet: function (item) {
                                return "<span class='c9 input-edit'  onclick=\"bt.pub.set_data_by_key('sites','ps',this)\">" + item.ps + "</span>";
                            }
                        },

                        {
                            field: 'opt', width: 260, title: lan.site.operate, align: 'right', templet: function (item) {
                                var opt = '';
                                var _check = ' onclick="site.site_waf(\'' + item.name + '\')"';

                                if (bt.os == 'Linux') opt += '<a href="javascript:;" ' + _check + ' class="btlink ">'+lan.site.firewalld+'</a> | ';
                                opt += '<a href="javascript:;" class="btlink" onclick="site.web_edit(this)">'+lan.site.set+' </a> | ';
                                opt += '<a href="javascript:;" class="btlink" onclick="site.del_site(' + item.id + ',\'' + item.name + '\')" title="'+lan.site.del_site+'">'+lan.site.del+'</a>';
                                return opt;
                            }
                        },
                    ],
                    data: data
                })

                //设置到期时间
                $('a.setTimes').each(function () {
                    var _this = $(this);
                    var _tr = _this.parents('tr');
                    var id = _this.attr('id');
                    laydate.render({
                        elem: '#' + id //指定元素
                        , lang: 'en'
                        , min: bt.get_date(1)
                        , max: '2099-12-31'
                        , vlue: bt.get_date(365)
                        , type: 'date'
                        , format: 'yyyy-MM-dd'
                        , trigger: 'click'
                        , btns: ['perpetual', 'confirm']
                        , theme: '#20a53a'
                        , done: function (dates) {
                            var item = _tr.data('item');
                            bt.site.set_endtime(item.id, dates, function () { })
                        }
                    });
                })
           //})
        });

    },
    site_waf: function (siteName) {
        try {
            site_waf_config(siteName);
        } catch (err) {
            site.no_firewall();
        }
        
    },
    get_types: function (callback) {
        bt.site.get_type(function (rdata) {
            var optionList = '';
            for (var i = 0; i < rdata.length; i++) {
                optionList += '<option value="' + rdata[i].id + '">' + rdata[i].name + '</option>'
            }
            if($('.dataTables_paginate').next().hasClass('site_type')) $('.site_type').remove();
            $('.dataTables_paginate').after('<div class="site_type"><span>'+lan.site.site_classification+':</span><select class="bt-input-text mr5"  style="width:auto"><option value="-1">'+lan.site.all_classification+'</option>' + optionList + '</select></div>');
            $('.site_type select').change(function () {
                var val = $(this).val();
                site.get_list(0, '', val);
                bt.set_cookie('site_type', val);
            })
            if(callback) callback(rdata);
        });
	},
    no_firewall: function (obj) {
        var typename = bt.get_cookie('serverType');
        layer.confirm(lan.site.firewalld_nonactivated_tips.replace('{1}',typename).replace('{2}',typename), {
            title: typename + lan.site.site_classification, icon: 7, closeBtn: 2,
            cancel: function () {
                if (obj) $(obj).prop('checked', false)
            }
        }, function () {
            window.location.href = '/soft';
        }, function () {
            if (obj) $(obj).prop('checked', false)
        })
    },
    site_detail: function (id, siteName, page) {
        if (page == undefined) page = '1';
        var loadT = bt.load(lan.public.the_get);
        bt.pub.get_data('table=backup&search=' + id + '&limit=5&type=0&tojs=site.site_detail&p=' + page, function (frdata) {
            loadT.close();
            var ftpdown = '';
            var body = '';
            var port;
            frdata.page = frdata.page.replace(/'/g, '"').replace(/site.site_detail\(/g, "site.site_detail(" + id + ",'" + siteName + "',");
            if ($('#SiteBackupList').length <= 0) {
                bt.open({
                    type: 1,
                    skin: 'demo-class',
                    area: '700px',
                    title: lan.site.backup_title,
                    closeBtn: 2,
                    shift: 5,
                    shadeClose: false,
                    content: "<div class='divtable pd15 style='padding-bottom: 0'><button id='btn_data_backup' class='btn btn-success btn-sm' type='button' style='margin-bottom:10px'>" + lan.database.backup + "</button><table width='100%' id='SiteBackupList' class='table table-hover'></table><div class='page sitebackup_page'></div></div>"
                });
            }
            setTimeout(function () {
                $('.sitebackup_page').html(frdata.page);
                var _tab = bt.render({
                    table: '#SiteBackupList',
                    columns: [
                        { field: 'name', title: lan.site.filename },
                        {
                            field: 'size', title: lan.site.filesize, templet: function (item) {
                                return bt.format_size(item.size);
                            }
                        },
                        { field: 'addtime', title: lan.site.backup_time },
                        {
                            field: 'opt', title: lan.site.operation, align: 'right', templet: function (item) {
                                var _opt = '<a class="btlink" href="/download?filename=' + item.filename + '&amp;name=' + item.name + '" target="_blank">'+lan.site.download+'</a> | ';
                                _opt += '<a class="btlink" herf="javascrpit:;" onclick="bt.site.del_backup(\'' + item.id + '\',\'' + id + '\',\'' + siteName + '\')">'+lan.site.del+'</a>'
                                return _opt;
                            }
                        },
                    ],
                    data: frdata.data
                });
                $('#btn_data_backup').unbind('click').click(function () {
                    bt.site.backup_data(id, function (rdata) {
                        if (rdata.status) site.site_detail(id, siteName);
                    })
                })
            }, 100)
        });
    },
    add_site: function () {
        bt.site.add_site(function (rdata) {
            if (rdata.siteStatus) {
                site.get_list();
                var html = '';
                var ftpData = '';
                if (rdata.ftpStatus) {
                    var list = [];
                    list.push({ title: lan.site.user, val: rdata.ftpUser });
                    list.push({ title: lan.site.password, val: rdata.ftpPass });
                    var item = {};
                    item.title = lan.site.ftp;
                    item.list = list;
                    ftpData = bt.render_ps(item);
                }
                var sqlData = '';
                if (rdata.databaseStatus) {
                    var list = [];
                    list.push({ title: lan.site.database_name, val: rdata.databaseUser });
                    list.push({ title: lan.site.user, val: rdata.databaseUser });
                    list.push({ title: lan.site.password, val: rdata.databasePass });
                    var item = {};
                    item.title = lan.site.database_txt;
                    item.list = list;
                    sqlData = bt.render_ps(item);
                }
                if (ftpData == '' && sqlData == '') {
                    bt.msg({ msg: lan.site.success_txt, icon: 1 })
                }
                else {
                    bt.open({
                        type: 1,
                        area: '600px',
                        title: lan.site.success_txt,
                        closeBtn: 2,
                        shadeClose: false,
                        content: "<div class='success-msg'><div class='pic'><img src='/static/img/success-pic.png'></div><div class='suc-con'>" + ftpData + sqlData + "</div></div>",
                    });

                    if ($(".success-msg").height() < 150) {
                        $(".success-msg").find("img").css({ "width": "150px", "margin-top": "30px" });
                    }
                }
            }
            else {
                bt.msg(rdata);
            }
        })
    },
    set_default_page: function () {
        bt.open({
            type: 1,
            area: '460px',
            title: lan.site.change_defalut_page,
            closeBtn: 2,
            shift: 0,
            content: '<div class="change-default pd20"><button  class="btn btn-default btn-sm ">' + lan.site.default_doc + '</button><button  class="btn btn-default btn-sm">' + lan.site.err_404 + '</button>	<button  class="btn btn-default btn-sm ">' + lan.site.empty_page + '</button><button  class="btn btn-default btn-sm ">' + lan.site.default_page_stop + '</button></div>'
        });
        setTimeout(function () {
            $('.change-default button').click(function () {
                bt.site.get_default_path($(this).index(), function (path) {
                    bt.pub.on_edit_file(0, path);
                })
            })
        }, 100)
    },
    set_default_site: function () {
        bt.site.get_default_site(function (rdata) {
            var arrs = [];
            arrs.push({title:lan.site.default_site_not_set,value:'0'})
            for (var i = 0; i < rdata.sites.length; i++) arrs.push({ title: rdata.sites[i].name, value: rdata.sites[i].name })
            var form = {
                title: lan.site.default_site_yes,
                area: '530px',
                list: [{ title: lan.site.default_site, name: 'defaultSite', width: '300px', value: rdata.defaultSite, type: 'select', items: arrs }],
                btns: [
                    bt.form.btn.close(),
                    bt.form.btn.submit(lan.site.submit, function (rdata, load) {
                        bt.site.set_default_site(rdata.defaultSite, function (rdata) {
                            load.close();
                            bt.msg(rdata);
                        })
                    })
                ]
            }
            bt.render_form(form);
            $('.line').after($(bt.render_help([lan.site.default_site_help_1, lan.site.default_site_help_2])).addClass('plr20'));
        })
    },
    //PHP-CLI
    get_cli_version: function () {
        $.post('/config?action=get_cli_php_version', {}, function (rdata) {
            if (rdata.status === false) {
                layer.msg(rdata.msg, { icon: 2 });
                return;
            }
            var _options = '';
            for (var i = rdata.versions.length - 1; i >= 0; i--) {
                var ed = '';
                if (rdata.select.version == rdata.versions[i].version) ed = 'selected'
                _options += '<option value="' + rdata.versions[i].version + '" '+ed+'>' + rdata.versions[i].name + '</option>';
            }
            var body = '<div class="bt-form bt-form pd20 pb70">\
                <div class="line">\
                    <span class="tname">'+lan.site.php_cli_ver+'</span>\
                    <div class="info-r ">\
                        <select class="bt-input-text mr5" name="php_version" style="width:300px">'+ _options + '</select>\
                    </div>\
                </div >\
                <ul class="help-info-text c7 plr20">\
                    <li>'+lan.site.php_cli_tips1+'</li>\
                    <li>'+lan.site.php_cli_tips2+'</li>\
                </ul>\
                <div class="bt-form-submit-btn"><button type="button" class="btn btn-sm btn-danger" onclick="layer.closeAll()">'+lan.site.turn_off+'</button><button type="button" class="btn btn-sm btn-success" onclick="site.set_cli_version()">'+lan.site.submit+'</button></div></div>';

            layer.open({
                type: 1,
                title: lan.site.set_php_cli_cmd ,
                area: '560px',
                closeBtn: 2,
                shadeClose: false,
                content: body
            });

        });

    },
    set_cli_version: function () {
        var php_version = $("select[name='php_version']").val();
        var loading = bt.load();
        $.post('/config?action=set_cli_php_version', { php_version: php_version }, function (rdata) {
            loading.close();
            if (rdata.status) {
                layer.closeAll();
            }
            layer.msg(rdata.msg, { icon: rdata.status ? 1 : 2 });
        });
    },
    del_site: function (wid, wname) {
        var thtml = "<div class='options' style='width: 320px'><label><input type='checkbox' id='delftp' name='ftp'><span>FTP</span></label><label><input type='checkbox' id='deldata' name='data'><span>" + lan.site.database + "</span></label><label><input type='checkbox' id='delpath' name='path'><span>" + lan.site.root_dir + "</span></label></div>";
        bt.show_confirm(lan.site.site_del_title + "[" + wname + "]", lan.site.site_del_info, function () {
            var ftp = '', data = '', path = '';
            var data = { id: wid, webname: wname }
            if ($("#delftp").is(":checked")) data.ftp = 1;
            if ($("#deldata").is(":checked")) data.database = 1;
            if ($("#delpath").is(":checked")) data.path = 1;

            bt.site.del_site(data, function (rdata) {
                if (rdata.status) site.get_list();
                bt.msg(rdata);
            })

        }, thtml);
    },
    batch_site: function (type, obj, result) {
        if (obj == undefined) {
            obj = {};
            var arr = [];
            result = { count: 0, error_list: [] };
            $('input[type="checkbox"].check:checked').each(function () {
                var _val = $(this).val();
                if (!isNaN(_val)) arr.push($(this).parents('tr').data('item'));
            })
            if (type == 'site_type') {
                bt.site.get_type(function (tdata) {
                    var types = [];
                    for (var i = 0; i < tdata.length; i++) types.push({ title: tdata[i].name, value: tdata[i].id })
                    var form = {
                        title: lan.site.set_site_classification,
                        area: '530px',
                        list: [{ title: lan.site.default_site, name: 'type_id', width: '300px', type: 'select', items: types }],
                        btns: [
                            bt.form.btn.close(),
                        bt.form.btn.submit(lan.site.submit, function (rdata, load) {
                                var ids = []
                                for (var x = 0; x < arr.length; x++) ids.push(arr[x].id);
                                bt.site.set_site_type({ id: rdata.type_id, site_array: JSON.stringify(ids) }, function (rrdata) {
                                    if (rrdata.status) {
                                        load.close();
                                        site.get_list();
                                    }
                                    bt.msg(rrdata);
                                })
                            })
                        ]
                    }
                    bt.render_form(form);
                })
                return;
            }
            var thtml = "<div class='options'><label style=\"width:100%;\"><input type='checkbox' id='delpath' name='path'><span>" + lan.site.all_del_info + "</span></label></div>";
            bt.show_confirm(lan.site.all_del_site, "<a style='color:red;'>" + lan.get('del_all_site', [arr.length]) + "</a>", function () {
                if ($("#delpath").is(":checked")) obj.path = '1';
                obj.data = arr;
                bt.closeAll();
                site.batch_site(type, obj, result);
            }, thtml);

            return;
        }
        var item = obj.data[0];
        switch (type) {
            case 'del':
                if (obj.data.length < 1) {
                    site.get_list();
                    bt.msg({ msg: lan.get('del_all_site_ok', [result.count]), icon: 1, time: 5000 });
                    return;
                }
                var data = { id: item.id, webname: item.name, path: obj.path }
                bt.site.del_site(data, function (rdata) {
                    if (rdata.status) {
                        result.count += 1;
                    } else {
                        result.error_list.push({ name: item.item, err_msg: rdata.msg });
                    }
                    obj.data.splice(0, 1)
                    site.batch_site(type, obj, result);
                })
                break;

        }
    },
    set_class_type: function () {
        var _form_data = bt.render_form_line({
            title: '',
            items: [
                { placeholder: lan.site.input_classification_name, name: 'type_name', width: '50%', type: 'text' },
                {
                    name: 'btn_submit', text: lan.site.add, type: 'button', callback: function (sdata) {
                        bt.site.add_type(sdata.type_name, function (ldata) {
                            if (ldata.status){
                                $('[name="type_name"]').val('');
                                site.get_class_type();
                            }
                            bt.msg(ldata);
                        })
                    }
                }
            ]
        });
        bt.open({
            type: 1,
            area: '350px',
            title: lan.site.mam_site_classificacion,
            closeBtn: 2,
            shift: 5,
            shadeClose: true,
            content: "<div class='bt-form edit_site_type'><div class='divtable mtb15' style='overflow:auto'>" + _form_data.html + "<table id='type_table' class='table table-hover' width='100%'></table></div></div>",
            success:function(){
                bt.render_clicks(_form_data.clicks);
                site.get_class_type(function(res){
                    $('#type_table').on('click','.del_type',function(){
                        var _this = $(this);
                        var item = _this.parents('tr').data('item');
                        if (item.id == 0) {
                            bt.msg({ icon: 2, msg: lan.site.default_classification_cant_operation });
                            return;
                        }
                        bt.confirm({ msg: lan.site.sure_del_classification, title: lan.site.del_classification+'【'+ item.name +'】' }, function () {
                            bt.site.del_type(item.id, function (ret) {
                                if (ret.status) {
                                    site.get_class_type();
                                    bt.set_cookie('site_type', '-1');
                                }
                                bt.msg(ret);
                            })
                        })
                    });
                    $('#type_table').on('click','.edit_type',function(){
                        var item = $(this).parents('tr').data('item');
                        if (item.id == 0) {
                            bt.msg({ icon: 2, msg: lan.site.default_classification_cant_operation });
                            return;
                        }
                        bt.render_form({
                            title: lan.site.edit_classification_mam+'【' + item.name + '】',
                            area: '350px',
                            list: [{ title: lan.site.classification_name, width: '150px', name: 'name', value: item.name }],
                            btns: [
                                { title: lan.site.turn_off, name: 'close' },
                                {
                                    title: lan.site.submit,
                                    name: 'submit',
                                    css: 'btn-success',
                                    callback: function (rdata, load, callback) {
                                        bt.site.edit_type({ id: item.id, name: rdata.name }, function (edata) {
                                            if (edata.status) {
                                                load.close();
                                                site.get_class_type();
                                            }
                                            bt.msg(edata);
                                        })
                                    }
                                }
                            ]
                        });
                    });
                });
            }
        });
    },
    get_class_type: function(callback){
      site.get_types(function(rdata){
        bt.render({
            table: '#type_table',
            columns: [
                { field: 'name', title: lan.site.name },
                { field: 'opt', width: '80px', title: lan.site.operate, templet: function (item) { return '<a class="btlink edit_type" href="javascript:;">'+lan.site.edit+'</a> | <a class="btlink del_type" href="javascript:;">'+lan.site.del+'</a>'; } }
            ],
            data: rdata
        });
        $('.layui-layer-page').css({ 'margin-top':'-' + ($('.layui-layer-page').height() / 2) +'px','top':'50%' });
        if(callback) callback(rdata);
      });
  	},
    ssl: {
        my_ssl_msg : null,
        renew_ssl: function (siteName) {
            data = {}
            if (siteName != undefined) data = { siteName: siteName }
            var loadT = bt.load("Renewing certificate at one click.")
            bt.send("renew_lets_ssl", 'ssl/renew_lets_ssl', data, function (rdata) {
                loadT.close();
                if (rdata.status) {
                    if (siteName != undefined) {
                        if (rdata.err_list.length > 0) {
                            bt.msg({ status: false, msg: rdata.err_list[0].msg })
                        }
                        else {
                            site.reload();
                            bt.msg({ status: true, time: 6, msg: 'The website [' + siteName + '] renewed the certificate successfully.' })
                        }
                    }
                    else {
                        var ehtml = '', shtml = ''

                        if (rdata.sucess_list.length > 0) {
                            var sucess = {};
                            sucess.title = "Successful renewal " + rdata.sucess_list.length + " certificate";
                            sucess.list = [{ title: "Domain name list", val: rdata.sucess_list.join() }];
                            shtml = bt.render_ps(sucess);
                        }

                        if (rdata.err_list.length > 0) {
                            var error = {};
                            error.title = "Renewal failed " + rdata.err_list.length + " certificate";
                            error.list = []
                            for (var i = 0; i < rdata.err_list.length; i++) {
                                error.list.push({ title: rdata.err_list[i]['siteName'], val: rdata.err_list[i]['msg'] })
                            }
                            ehtml = bt.render_ps(error);
                        }

                        bt.open({
                            type: 1,
                            area: '600px',
                            title: "Successful visa renewal",
                            closeBtn: 2,
                            shadeClose: false,
                            content: "<div class='success-msg'><div class='pic'><img src='/static/img/success-pic.png'></div><div class='suc-con'>" + shtml + ehtml + "</div></div>",
                        });

                        if ($(".success-msg").height() < 150) {
                            $(".success-msg").find("img").css({ "width": "150px", "margin-top": "30px" });
                        }
                    }
                }
                else {
                    bt.msg(rdata)
                }
            })
        },
        get_renew_stat: function () {
            $.post('/ssl?action=Get_Renew_SSL', {}, function (task_list) {
                if (!task_list.status) return;
                var s_body = '';
                var b_stat = false;
                for (var i = 0; i < task_list.data.length; i++) {
                    s_body += '<p>' + task_list.data[i].subject + ' >> ' + task_list.data[i].msg + '</p>';
                    if (task_list.data[i].status !== true && task_list.data[i].status !== false) {
                        b_stat = true;
                    }
                }

                if (site.ssl.my_ssl_msg) {
                    $(".my-renew-ssl").html(s_body);
                } else {
                    site.ssl.my_ssl_msg = layer.msg('<div class="my-renew-ssl">' + s_body + '</div>', { time: 0 ,icon:16,shade:0.3});
                }

                if (!b_stat) {
                    setTimeout(function () {
                        layer.close(site.ssl.my_ssl_msg);
                        site.ssl.my_ssl_msg = null;
                    }, 3000);
                    return;
                }

                setTimeout(function () { site.ssl.get_renew_stat(); }, 1000);


            });
        },
        onekey_ssl: function (partnerOrderId, siteName) {
            bt.site.get_ssl_info(partnerOrderId, siteName, function (rdata) {
                bt.msg(rdata);
                if (rdata.status) site.reload(7);
            })
        },
        set_ssl_status: function (action, siteName) {
            bt.site.set_ssl_status(action, siteName, function (rdata) {
                bt.msg(rdata);
                if (rdata.status) {
                    site.reload(7);
                    if (action == 'CloseSSLConf') {
                        layer.msg(lan.site.ssl_close_info, { icon: 1, time: 5000 });
                    }
                }
            })
        },
        verify_domain: function (partnerOrderId, siteName) {
            bt.site.verify_domain(partnerOrderId, siteName, function (vdata) {
                bt.msg(vdata);
                if (vdata.status) {
                    if (vdata.data.stateCode == 'COMPLETED') {
                        site.ssl.onekey_ssl(partnerOrderId, siteName)
                    } else {
                        layer.msg('Waiting for CA verification, if it fails to verify successfully for a long time, please log in to the official website and use DNS to re-apply...');
                    }

                }
            })
        },
        reload: function (index) {
            if (index == undefined) index = 0
            var _sel = $('#ssl_tabs .on');
            if (_sel.length == 0) _sel = $('#ssl_tabs span:eq(0)');
            _sel.trigger('click');
        }
    },
    edit: {
        set_domains: function (web) {
            var _this = this;
            bt.site.get_domains(web.id, function (rdata) {
                var list = [
                    {
                        items: [
                            { name: 'newdomain', width: '400px', type: 'textarea', placeholder: lan.site.domain_help },
                            {
                                name: 'btn_submit_domain', text: lan.site.add, type: 'button', callback: function (sdata) {
                                    var arrs = sdata.newdomain.split("\n");
                                    var domins = "";
                                    for (var i = 0; i < arrs.length; i++) domins += arrs[i] + ",";
                                    bt.site.add_domains(web.id, web.name, bt.rtrim(domins, ','), function (ret) {
                                        if (ret.status) site.reload(0)
                                    })
                                }
                            }
                        ]
                    }
                ]
                var _form_data = bt.render_form_line(list[0]);
                $('#webedit-con').html(_form_data.html + "<div class='divtable mtb15' style='height:350px;overflow:auto'><table id='domain_table' class='table table-hover' width='100%'></table></div>");
                bt.render_clicks(_form_data.clicks);
                $('.placeholder').css({ 'width':'340px', 'heigth':'100px','left': '0px', 'top': '0px',  'padding-top': '10px','padding-left': '15px'});
                $('.btn_submit_domain').addClass('pull-right').css("margin", "30px 35px 0 0")
                $(".placeholder").click(function () {
                    $(this).hide();
                    $('.newdomain').focus();
                })
                $('.domains').focus(function () { $(".placeholder").hide(); });
                $('.domains').blur(function () {
                    if ($(this).val().length == 0) $(".placeholder").show();
                });

                bt.render({
                    table: '#domain_table',
                    columns: [
                        { field: 'name', title: lan.site.domain, templet: function (item) { return "<a title='" + lan.site.click_access + "' target='_blank' href='http://" + item.name + ":" + item.port + "' class='btlinkbed'>" + item.name + "</a>" } },
                        { field: 'port', width: '70px', title: lan.site.port },
                        { field: 'opt', width: '50px', title: lan.site.operate, templet: function (item) { return '<a class="table-btn-del domain_del" href="javascript:;"><span class="glyphicon glyphicon-trash"></span></a>'; } }
                    ],
                    data: rdata
                })
                setTimeout(function () {
                    $('.domain_del').click(function () {
                        if ($(this).parents('tbody').find('tr').length == 1) {
                            bt.msg({ msg: lan.site.domain_last_cannot, icon: 2 });
                            return;
                        }
                        var item = $(this).parents('tr').data('item');
                        bt.confirm({title: lan.site.del_domain+'【'+ item.name +'】', msg: lan.site.domain_del_confirm }, function () {
                            bt.site.del_domain(web.id, web.name, item.name, item.port, function (ret) {
                                if (ret.status) site.reload(0)
                            })
                        })
                    })
                }, 100)
            })
        },
        set_dirbind: function (web) {
            var _this = this;
            bt.site.get_dirbind(web.id, function (rdata) {
                var dirs = [];
                for (var n = 0; n < rdata.dirs.length; n++) dirs.push({ title: rdata.dirs[n], value: rdata.dirs[n] });
                var data = {
                    title: '', items: [
                        { title: lan.site.domain, width: '140px', name: 'domain' },
                        { title: lan.site.subdirectories, name: 'dirName', type: 'select', items: dirs },
                        {
                            text: lan.site.add, type: 'button', name: 'btn_add_subdir', callback: function (sdata) {
                                if (!sdata.domain || !sdata.dirName) {
                                    layer.msg(lan.site.d_s_empty, { icon: 2 });
                                    return;
                                }
                                bt.site.add_dirbind(web.id, sdata.domain, sdata.dirName, function (ret) {
                                    layer.msg(ret.msg, { icon: ret.status ? 1 : 2 });
                                    if (ret.status) site.reload(1)
                                })
                            }
                        }
                    ]
                }
                var _form_data = bt.render_form_line(data);
                $('#webedit-con').html(_form_data.html + '<div class="divtable mtb15" style="height:450px;overflow:auto"><table id="sub_dir_table" class="table table-hover" width="100%" style="margin-bottom:0"></table></div>');
                bt.render_clicks(_form_data.clicks);
                bt.render({
                    table: '#sub_dir_table',
                    columns: [
                        { field: 'domain', title: lan.site.domain },
                        { field: 'port', width: '70px', title: lan.site.port },
                        { field: 'path', width: '100px', title: lan.site.subdirectories },
                        {
                            field: 'opt', width: '100px', align: 'right', title: lan.site.operate, templet: function (item) {
                                return '<a class="btlink rewrite" href="javascript:;">'+lan.site.site_menu_4+'</a> | <a class="btlink del" href="javascript:;">'+lan.site.del+'</a>';
                            }
                        }
                    ],
                    data: rdata.binding
                })
                setTimeout(function () {
                    $('#sub_dir_table td a').click(function () {
                        var item = $(this).parents('tr').data('item');
                        if ($(this).hasClass('del')) {
                            bt.confirm({ msg: lan.site.s_bin_del }, function () {
                                bt.site.del_dirbind(item.id, function (ret) {
                                    if (ret.status) site.reload(1)
                                })
                            })
                        } else {
                            bt.site.get_dir_rewrite({ id: item.id }, function (ret) {
                                if (!ret.status) {
                                    var confirmObj = layer.confirm(lan.site.url_rewrite_alter, { icon: 3, closeBtn: 2 }, function () {
                                        bt.site.get_dir_rewrite({ id: item.id, add: 1 }, function (ret) {
                                            layer.close(confirmObj);
                                            show_dir_rewrite(ret);
                                        });
                                    });
                                    return;
                                }
                                show_dir_rewrite(ret);

                                function show_dir_rewrite(ret) {
                                    var arrs = [];
                                    for (var i = 0; i < ret.rlist.length; i++) arrs.push({ title: ret.rlist[i], value: ret.rlist[i] });
                                    var datas = [{
                                        name: 'dir_rewrite', type: 'select', width: '130px', items: arrs, callback: function (obj) {
                                            var spath = '/www/server/panel/rewrite/' + bt.get_cookie('serverType') + '/' + obj.val() + '.conf';
                                            bt.files.get_file_body(spath, function (sdata) {
                                                $('.dir_config').text(sdata.data);
                                            })
                                        }
                                    },
                                    { items: [{ name: 'dir_config', type: 'textarea', value: ret.data, width: '470px', height: '260px' }] },
                                    {
                                        items: [{
                                            name: 'btn_save', text: lan.site.save, type: 'button', callback: function (ldata) {
                                                bt.files.set_file_body(ret.filename, ldata.dir_config, 'utf-8', function (sdata) {
                                                    if (sdata.status) load_form.close();
                                                    bt.msg(sdata);
                                                })
                                            }
                                        }]
                                    }]
                                    var load_form = bt.open({
                                        type: 1,
                                        area: '510px',
                                        title: lan.site.config_url,
                                        closeBtn: 2,
                                        shift: 5,
                                        skin: 'bt-w-con',
                                        shadeClose: true,
                                        content: "<div class='bt-form webedit-dir-box dir-rewrite-man-con'></div>"
                                    });

                                    setTimeout(function () {
                                        var _html = $(".webedit-dir-box")
                                        var clicks = [];
                                        for (var i = 0; i < datas.length; i++) {
                                            var _form_data = bt.render_form_line(datas[i]);
                                            _html.append(_form_data.html);
                                            var _other = (bt.os == 'Linux' && i == 0) ? '<span>'+lan.site.rewrite_change_tools+'：<a href="https://www.bt.cn/Tools" target="_blank" style="color:#20a53a">'+lan.site.ap_change_ng+'</a></span>' : '';
                                            _html.find('.info-r').append(_other)
                                            clicks = clicks.concat(_form_data.clicks);
                                        }
                                        _html.append(bt.render_help([lan.site.rewrite_tips, lan.site.edit_rewrite]));
                                        bt.render_clicks(clicks);
                                    }, 100)
                                }
                            })
                        }
                    })
                }, 100)
            })
        },
        set_dirpath: function (web) {
            var loading = bt.load();
            bt.site.get_site_path(web.id, function (path) {
                bt.site.get_dir_userini(web.id, path, function (rdata) {
                    loading.close();
                    var dirs = [];
                    var is_n = false;
                    for (var n = 0; n < rdata.runPath.dirs.length; n++) {
                        dirs.push({ title: rdata.runPath.dirs[n], value: rdata.runPath.dirs[n] });
                        if (rdata.runPath.runPath === rdata.runPath.dirs[n]) is_n = true;
                    }
                    if (!is_n) dirs.push({ title: rdata.runPath.runPath, value: rdata.runPath.runPath });
                    var datas = [
                        {
                            title: '', items: [
                                {
                                    name: 'userini', type: 'checkbox', text: lan.site.anti_XSS_attack+'(open_basedir)', value: rdata.userini, callback: function (sdata) {
                                        bt.site.set_dir_userini(path, function (ret) {
                                            if (ret.status) site.reload(2)
                                            layer.msg(ret.msg, { icon: ret.status ? 1 : 2 });
                                        })
                                    }
                                },
                                {
                                    name: 'logs', type: 'checkbox', text: lan.site.write_access_log, value: rdata.logs, callback: function (sdata) {
                                        bt.site.set_logs_status(web.id, function (ret) {
                                            if (ret.status) site.reload(2)
                                            layer.msg(ret.msg, { icon: ret.status ? 1 : 2 });
                                        })
                                    }
                                }
                            ]
                        },
                        {
                            title: '', items: [
                                { name: 'path', title: lan.site.site_menu_2, width: '50%', value: path, event: { css: 'glyphicon-folder-open', callback: function (obj) { bt.select_path(obj); } } },
                                {
                                    name: 'btn_site_path', type: 'button', text: lan.site.save, callback: function (pdata) {
                                        bt.site.set_site_path(web.id, pdata.path, function (ret) {
                                            if (ret.status) site.reload(2)
                                            layer.msg(ret.msg, { icon: ret.status ? 1 : 2 });
                                        })
                                    }
                                }
                            ]
                        },
                        {
                            title: '', items: [
                                { title: lan.site.run_dir, width: '50%', value: rdata.runPath.runPath, name: 'dirName', type: 'select', items: dirs },
                                {
                                    name: 'btn_run_path', type: 'button', text: lan.site.save, callback: function (pdata) {
                                        bt.site.set_site_runpath(web.id, pdata.dirName, function (ret) {
                                            if (ret.status) site.reload(2)
                                            layer.msg(ret.msg, { icon: ret.status ? 1 : 2 });
                                        })
                                    }
                                }
                            ]
                        }
                    ]
                    var _html = $("<div class='webedit-box soft-man-con'></div>")
                    var clicks = [];
                    for (var i = 0; i < datas.length; i++) {
                        var _form_data = bt.render_form_line(datas[i]);
                        _html.append($(_form_data.html).addClass('line mtb10'));
                        clicks = clicks.concat(_form_data.clicks);
                    }
                    _html.find('input[type="checkbox"]').parent().addClass('label-input-group ptb10');
                    _html.find('button[name="btn_run_path"]').addClass('ml45');
                    _html.find('button[name="btn_site_path"]').addClass('ml33');
                    _html.append(bt.render_help([lan.site.specify_subdir]));
                    if (bt.os == 'Linux') _html.append('<div class="user_pw_tit" style="margin-top: 2px;padding-top: 11px;"><span class="tit">'+lan.site.pass_visit+'</span><span class="btswitch-p"><input class="btswitch btswitch-ios" id="pathSafe" type="checkbox"><label class="btswitch-btn phpmyadmin-btn" for="pathSafe" ></label></span></div><div class="user_pw" style="margin-top: 10px; display: block;"></div>')

                    $('#webedit-con').append(_html);
                    bt.render_clicks(clicks);
                    $('#pathSafe').click(function () {
                        var val = $(this).prop('checked');
                        var _div = $('.user_pw')
                        if (val) {
                            var dpwds = [
                                { title: lan.site.access_account, width: '250px', name: 'username_get', placeholder: lan.site.no_change_set_empty },
                                { title: lan.site.pass_visit, width: '250px', type: 'password', name: 'password_get_1', placeholder: lan.site.no_change_set_empty },
                                { title: lan.site.pass_again, width: '250px', type: 'password', name: 'password_get_2', placeholder: lan.site.no_change_set_empty },
                                {
                                    name: 'btn_password_get', text: lan.site.save, type: 'button', callback: function (rpwd) {
                                        if (rpwd.password_get_1 != rpwd.password_get_2) {
                                            layer.msg(lan.bt.pass_err_re, { icon: 2 });
                                            return;
                                        }
                                        bt.site.set_site_pwd(web.id, rpwd.username_get, rpwd.password_get_1, function (ret) {
                                            layer.msg(ret.msg, {icon:ret.status?1:2})
                                            if (ret.status) site.reload(2)
                                        })
                                    }
                                }
                            ]
                            for (var i = 0; i < dpwds.length; i++) {
                                var _from_pwd = bt.render_form_line(dpwds[i]);
                                _div.append("<div class='line'>" + _from_pwd.html + "</div>");
                                bt.render_clicks(_from_pwd.clicks);
                            }
                        } else {
                            bt.site.close_site_pwd(web.id, function (rdata) {
                                layer.msg(rdata.msg, { icon: rdata.status ? 1 : 2 });
                                _div.html('');
                            })
                        }
                    })
                    if (rdata.pass) $('#pathSafe').trigger('click');
                })
            })
        },
        limit_network: function (web) {
            bt.site.get_limitnet(web.id, function (rdata) {
                var limits = [
                    { title: lan.site.bbs_or_blog, value: 1, items: { perserver: 300, perip: 25, limit_rate: 512 } },
                    { title: lan.site.photo_station, value: 2, items: { perserver: 200, perip: 10, limit_rate: 1024 } },
                    { title: lan.site.download_station, value: 3, items: { perserver: 50, perip: 3, limit_rate: 2048 } },
                    { title: lan.site.mall, value: 4, items: { perserver: 500, perip: 10, limit_rate: 2048 } },
                    { title: lan.site.portal_site, value: 5, items: { perserver: 400, perip: 15, limit_rate: 1024 } },
                    { title: lan.site.enterprise, value: 6, items: { perserver: 60, perip: 10, limit_rate: 512 } },
                    { title: lan.site.video, value: 7, items: { perserver: 150, perip: 4, limit_rate: 1024 } }
                ]
                var datas = [
                    {
                        items: [{
                            name: 'status', type: 'checkbox', value: rdata.perserver != 0 ? true : false, text: lan.site.limit_net_8, callback: function (ldata) {
                                if (ldata.status) {
                                    bt.site.set_limitnet(web.id, ldata.perserver, ldata.perip, ldata.limit_rate, function (ret) {
                                        layer.msg(ret.msg, { icon: ret.status ? 1 : 2 });
                                        if (ret.status) site.reload(3)
                                    })
                                } else {
                                    bt.site.close_limitnet(web.id, function (ret) {
                                        layer.msg(ret.msg, { icon: ret.status ? 1 : 2 });
                                        if (ret.status) site.reload(3)
                                    })
                                }
                            }
                        }]
                    },
                    {
                        items: [{
                            title: lan.site.limit_net_9+'  ', width: '160px', name: 'limit', type: 'select', items: limits, callback: function (obj) {
                                var data = limits.filter(function (p) { return p.value === parseInt(obj.val()); })[0]
                                for (var key in data.items) $('input[name="' + key + '"]').val(data.items[key]);
                            }
                        }]
                    },
                    { items: [{ title: lan.site.limit_net_10+'   ', type: 'number', width: '200px', value: rdata.perserver, name: 'perserver' }] },
                    { items: [{ title: lan.site.limit_net_12+'   ', type: 'number', width: '200px', value: rdata.perip, name: 'perip' }] },
                    { items: [{ title: lan.site.limit_net_14+'   ', type: 'number', width: '200px', value: rdata.limit_rate, name: 'limit_rate' }] },
                    {
                        name: 'btn_limit_get', text: lan.site.save, type: 'button', callback: function (ldata) {
                            bt.site.set_limitnet(web.id, ldata.perserver, ldata.perip, ldata.limit_rate, function (ret) {
                                layer.msg(ret.msg, { icon: ret.status ? 1 : 2 });
                                if (ret.status) site.reload(3)
                            })
                        }
                    }
                ]
                var _html = $("<div class='webedit-box soft-man-con'></div>")
                var clicks = [];
                for (var i = 0; i < datas.length; i++) {
                    var _form_data = bt.render_form_line(datas[i]);
                    _html.append(_form_data.html);
                    clicks = clicks.concat(_form_data.clicks);
                }
                _html.find('input[type="checkbox"]').parent().addClass('label-input-group ptb10');
                _html.append(bt.render_help([lan.site.limit_net_11, lan.site.limit_net_13, lan.site.limit_net_15]));
                $('#webedit-con').append(_html);
                bt.render_clicks(clicks);
                if (rdata.perserver == 0) $("select[name='limit']").trigger("change")
            })
        },
        get_rewrite_list: function (web) {
            var filename = '/www/server/panel/vhost/rewrite/' + web.name + '.conf';
            
            bt.site.get_rewrite_list(web.name, function (rdata) {
                if (bt.get_cookie('serverType') == 'apache') filename = rdata.sitePath + '/.htaccess';
                var arrs = [];
                for (var i = 0; i < rdata.rewrite.length; i++) arrs.push({ title: rdata.rewrite[i], value: rdata.rewrite[i] });

                var datas = [{
                    name: 'rewrite', type: 'select', width: '130px', items: arrs, callback: function (obj) {
                        if (bt.os == 'Linux') {
                            var spath = filename;
                            if (obj.val() != lan.site.rewritename) spath = '/www/server/panel/rewrite/' + bt.get_cookie('serverType') + '/' + obj.val() + '.conf';
                            bt.files.get_file_body(spath, function (ret) {
                                editor.setValue(ret.data);
                            })
                        }
                    }
                },
                { items: [{ name: 'config', type: 'textarea', value: rdata.data, widht: '340px', height: '200px' }] },
                {
                    items: [{
                        name: 'btn_save', text: lan.site.save, type: 'button', callback: function (ldata) {
                            bt.files.set_file_body(filename, editor.getValue(), 'utf-8', function (ret) {
                                if (ret.status) site.reload(4)
                                bt.msg(ret);
                            })
                        }
                    },
                    {
                        name: 'btn_save_to', text: lan.site.save_as_template, type: 'button', callback: function (ldata) {
                            var temps = {
                                title: lan.site.save_rewrite_temp,
                                area: '330px',
                                list: [
                                    { title: lan.site.template_name, placeholder: lan.site.template_name, width: '160px', name: 'tempname' }
                                ],
                                btns: [
                                    { title: lan.site.turn_off, name: 'close' },
                                    {
                                        title: lan.site.submit, name: 'submit', css: 'btn-success', callback: function (rdata, load, callback) {
                                            bt.site.set_rewrite_tel(rdata.tempname, editor.getValue(), function (rRet) {
                                                if (rRet.status) {
                                                    load.close();
                                                    site.reload(4)
                                                }
                                                bt.msg(rRet);
                                            })
                                        }
                                    }
                                ]
                            }
                            bt.render_form(temps);
                        }
                    }]
                }
                ]
                var _html = $("<div class='webedit-box soft-man-con'></div>")
                var clicks = [];
                for (var i = 0; i < datas.length; i++) {
                    var _form_data = bt.render_form_line(datas[i]);
                    _html.append(_form_data.html);
                    var _other = (bt.os == 'Linux' && i == 0) ? '<span>'+lan.site.rewrite_change_tools+'：<a href="https://www.bt.cn/Tools" target="_blank" style="color:#20a53a">'+lan.site.ap_change_ng+'</a></span>' : '';
                    _html.find('.info-r').append(_other)
                    clicks = clicks.concat(_form_data.clicks);
                }
                _html.append(bt.render_help([lan.site.rewrite_tips, lan.site.edit_rewrite]));
                $('#webedit-con').append(_html);
                bt.render_clicks(clicks);

                $('textarea.config').attr('id', 'config_rewrite');
                var editor = CodeMirror.fromTextArea(document.getElementById("config_rewrite"), {
                    extraKeys: { "Ctrl-Space": "autocomplete" },
                    lineNumbers: true,
                    matchBrackets: true,
                });

                $(".CodeMirror-scroll").css({ "height": "340px", "margin": 0, "padding": 0 });
                $(".soft-man-con .CodeMirror").css({ "height": "342px" });
                setTimeout(function () {
                    editor.refresh();
                }, 250);

                $('select.rewrite').trigger('change')

                

            })
        },
        set_default_index: function (web) {
            bt.site.get_index(web.id, function (rdata) {
                rdata = rdata.replace(new RegExp(/(,)/g), "\n");
                var data = {
                    items: [
                        { name: 'Dindex', height: '230px', width: '50%', type: 'textarea', value: rdata },
                        {
                            name: 'btn_submit', text: lan.site.add, type: 'button', callback: function (ddata) {
                                var Dindex = ddata.Dindex.replace(new RegExp(/(\n)/g), ",");
                                bt.site.set_index(web.id, Dindex, function (ret) {
                                    if (ret.status) site.reload(5)
                                })
                            }
                        }
                    ]
                }
                var _form_data = bt.render_form_line(data);
                var _html = $(_form_data.html)
                _html.append(bt.render_help([lan.site.default_doc_help]))
                $('#webedit-con').append(_html);
                $('.btn_submit').addClass('pull-right').css("margin", "90px 100px 0 0")
                bt.render_clicks(_form_data.clicks);
            })
        },
        set_config: function (web) {
            bt.site.get_site_config(web.name, function (rdata) {
                if (!rdata.status) {
                    bt.msg(rdata);
                    return;
                }
                var datas = [
                    { items: [{ name: 'site_config', type: 'textarea', value: rdata.data, widht: '340px', height: '200px' }] },
                    {
                        name: 'btn_config_submit', text: lan.site.save, type: 'button', callback: function (ddata) {
                            bt.site.set_site_config(web.name, editor.getValue(), rdata.encoding, function (ret) {
                                if (ret.status) site.reload(6)
                                bt.msg(ret);
                            })
                        }
                    }
                ]
                var robj = $('#webedit-con');
                for (var i = 0; i < datas.length; i++) {
                    var _form_data = bt.render_form_line(datas[i]);
                    robj.append(_form_data.html);
                    bt.render_clicks(_form_data.clicks);
                }
                robj.append(bt.render_help([lan.site.web_config_help]));
                $('textarea.site_config').attr('id', 'configBody');
                var editor = CodeMirror.fromTextArea(document.getElementById("configBody"), {
                    extraKeys: { "Ctrl-Space": "autocomplete" },
                    lineNumbers: true,
                    matchBrackets: true,
                });
                $(".CodeMirror-scroll").css({ "height": "400px", "margin": 0, "padding": 0 });
            })
        },
        set_ssl: function (web) {
            $('#webedit-con').html("<div id='ssl_tabs'></div><div class=\"tab-con\" style=\"padding:10px 0px;\"></div>");
            bt.site.get_site_ssl(web.name, function (rdata) {
                var _tabs = [
										// {
										//     title: lan.site.bt_ssl, on: true, callback: function (robj) {
										//         bt.pub.get_user_info(function (udata) {
										//             if (udata.status) {
										//                 bt.site.get_domains(web.id, function (ddata) {
										//                     var domains = [];
										//                     for (var i = 0; i < ddata.length; i++) {
										//                         if (ddata[i].name.indexOf('*') == -1) domains.push({ title: ddata[i].name, value: ddata[i].name });
										//                     }
										//                     var arrs1 = [
										//                         { title: lan.site.domain, width: '200px', name: 'domains', type: 'select', items: domains },
										//                         {
										//                             title: ' ', name: 'btsslApply', text: lan.site.btapply, type: 'button', callback: function (sdata) {
										//                                 if (sdata.domains.indexOf('www.') != -1) {
										//                                     var rootDomain = sdata.domains.split(/www\./)[1];
										//                                     if (!$.inArray(domains, rootDomain)) {
										//                                         layer.msg(lan.site.not_resolve_domain.replace('{1}',sdata.domains).replace("{2}",rootDomain), { icon: 2, time: 5000 });
										//                                         return;
										//                                     }
										//                                 }
										//                                 bt.site.get_dv_ssl(sdata.domains, web.path, function (tdata) {
										//                                     bt.msg(tdata);
										//                                     if (tdata.status) site.ssl.verify_domain(tdata.data.partnerOrderId, web.name);
										//                                 })
										//                             }
										//                         }
										//                     ]
										//                     for (var i = 0; i < arrs1.length; i++) {
										//                         var _form_data = bt.render_form_line(arrs1[i]);
										//                         robj.append(_form_data.html);
										//                         bt.render_clicks(_form_data.clicks);
										//                     }
										//                     var loading = bt.load()
										//                     bt.site.get_order_list(web.name, function (odata) {
										//                         loading.close();
										//                         robj.append("<div class=\"divtable mtb15 table-fixed-box\" style=\"max-height:200px;overflow-y: auto;\"><table id='bt_order_list' class='table table-hover'></table></div>");
										//                         bt.render({
										//                             table: '#bt_order_list',
										//                             columns: [
										//                                 { field: 'commonName', title: lan.site.domain },
										//                                 {
										//                                     field: 'endtime', width: '70px', title: lan.site.endtime, templet: function (item) {
										//                                         return bt.format_data(item.endtime, 'yyyy/MM/dd');
										//                                     }
										//                                 },
										//                                 { field: 'stateName', width: '100px', title: lan.site.status },
										//                                 {
										//                                     field: 'opt', align: 'right', width: '100px', title: lan.site.operate, templet: function (item) {
										//                                         var opt = '<a class="btlink" onclick="site.ssl.onekey_ssl(\'' + item.partnerOrderId + '\',\'' + web.name + '\')" href="javascript:;">'+lan.site.deploy+'</a>'
										//                                         if (item.stateCode == 'WF_DOMAIN_APPROVAL') {
										//                                             opt = '<a class="btlink" onclick="site.ssl.verify_domain(\'' + item.partnerOrderId + '\',\'' + web.name + '\')" href="javascript:;">'+lan.site.domain_validate+'</a>';
										//                                         }
										//                                         else {
										//                                             if (item.setup) opt = lan.site.deployed+' | <a class="btlink" href="javascript:site.ssl.set_ssl_status(\'CloseSSLConf\',\'' + web.name + '\')">'+lan.site.turn_off+'</a>'
										//                                         }
										//                                         return opt;
										//                                     }
										//                                 }
										//                             ],
										//                             data: odata.data
										//                         })
										//                         bt.fixed_table('bt_order_list');
										//                         var helps = [
										//                             lan.site.ssl_tips1,
										//                             lan.site.ssl_tips2,
										//                             lan.site.ssl_tips3,
										//                             lan.site.ssl_tips4,
										//                             lan.site.ssl_tips5,
										//                             lan.site.ssl_tips6
										//                         ]
										//                         robj.append(bt.render_help(helps));
										//                     })
										//                 })
										//             }
										//             else {
										//                 robj.append('<div class="alert alert-warning" style="padding:10px">'+lan.site.bt_bind_no+'</div>');
										//
										//                 var datas = [
										//                     { title: lan.site.bt_user, name: 'bt_username', value: rdata.email, width: '260px', placeholder: lan.site.phone_input },
										//                     { title: lan.site.password, type: 'password', name: 'bt_password', value: rdata.email, width: '260px' },
										//                     {
										//                         title: ' ', items: [
										//                             {
										//                                 text: lan.site.login, name: 'btn_ssl_login', type: 'button', callback: function (sdata) {
										//                                     bt.pub.login_btname(sdata.bt_username, sdata.bt_password, function (ret) {
										//                                         if (ret.status) site.reload(7);
										//                                     })
										//                                 }
										//                             },
										//                             {
										//                                 text: lan.site.bt_reg, name: 'bt_register', type: 'button', callback: function (sdata) {
										//                                     window.open('https://www.bt.cn/register.html')
										//                                 }
										//                             }
										//                         ]
										//                     }
										//                 ]
										//                 for (var i = 0; i < datas.length; i++) {
										//                     var _form_data = bt.render_form_line(datas[i]);
										//                     robj.append(_form_data.html);
										//                     bt.render_clicks(_form_data.clicks);
										//                 }
										//                 robj.append(bt.render_help([lan.site.bt_ssl_help_1, lan.site.bt_ssl_help_2, lan.site.bt_ssl_help_3, lan.site.bt_ssl_help_4]));
										//             }
										//         })
										//
										//     }
										// },
                    {
                        title: "Let's Encrypt", callback: function (robj) {
                            if (rdata.status && rdata.type == 1) {
                                var cert_info = '';
                                if (rdata.cert_data['notBefore']) {
                                    cert_info = '<div style="margin-bottom: 10px;" class="alert alert-success">\
                                        <p style="margin-bottom: 9px;"><span style="width: 357px;display: inline-block;"><b>'+lan.site.deploy_success_cret+'</b>'+lan.site.try_renew_cret+'</span>\
                                        <span style="margin-left: 20px;display: inline-block;overflow: hidden;text-overflow: ellipsis;white-space: nowrap;max-width: 140px;width: 140px;">\
                                        <b>'+lan.site.cert_brand+'</b>'+ rdata.cert_data.issuer+'</span></p>\
                                        <span style="display:inline-block;max-width: 357px;overflow:hidden;text-overflow:ellipsis;vertical-align:-3px;white-space: nowrap;width: 357px;"><b>'+lan.site.auth_domain+'</b> ' + rdata.cert_data.dns.join('、') + '</span>\
                                        <span style="margin-left: 20px;"><b>'+lan.site.expire_time+'</b> ' + rdata.cert_data.notAfter + '</span></div>'
                                }
                                robj.append('<div>' + cert_info + '<div><span>'+lan.site.ssl_key+'</span><span style="padding-left:194px">'+lan.site.ssl_crt+'</span></div></div>');
                                var datas = [
                                    {
                                        items: [
                                            { name: 'key', width: '45%', height: '220px', type: 'textarea', value: rdata.key },
                                            { name: 'csr', width: '45%', height: '220px', type: 'textarea', value: rdata.csr }
                                        ]
                                    },
                                    {
                                        items: [
                                            {
                                                text: lan.site.ssl_close, name: 'btn_ssl_close', hide: !rdata.status, type: 'button', callback: function (sdata) {
                                                    site.ssl.set_ssl_status('CloseSSLConf', web.name);
                                                }
                                            },
                                            {
                                                text: lan.site.ssl_renew, name: 'btn_ssl_renew', hide: !rdata.status, type: 'button', callback: function (sdata) {
                                                    site.ssl.renew_ssl();
                                                }
                                            }
                                        ]
                                    }
                                ]
                                for (var i = 0; i < datas.length; i++) {
                                    var _form_data = bt.render_form_line(datas[i]);
                                    robj.append(_form_data.html);
                                    bt.render_clicks(_form_data.clicks);
                                }
                                robj.find('textarea').css('background-color', '#f6f6f6').attr('readonly', true);
                                var helps = [
                                    lan.site.ssl_tips1,
                                    lan.site.ssl_tips2,
                                    lan.site.ssl_tips3,
                                    lan.site.ssl_tips4,
                                    lan.site.ssl_tips5,
                                ]
                                robj.append(bt.render_help([lan.site.ssl_help_2, lan.site.ssl_help_3]));
                                return;
                            }
                            bt.site.get_site_domains(web.id, function (ddata) {
                                var helps = [[
                                        lan.site.bt_ssl_help_5,
                                        lan.site.bt_ssl_help_8,
                                        lan.site.bt_ssl_help_9,
                                        lan.site.ssl_tips5
                                ], [
                                        lan.site.dns_check_tips1,
                                        lan.site.dns_check_tips2,
                                        lan.site.dns_check_tips3,
                                        lan.site.dns_check_tips4
                                ]]
                                var datas = [
                                    {
                                        title: lan.site.checking_mode, items: [
                                            {
                                                name: 'check_file', text: lan.site.file_check, type: 'radio', callback: function (obj) {
                                                    $('.checks_line').remove()
                                                    $(obj).siblings().removeAttr('checked');

                                                    $('.help-info-text').html($(bt.render_help(helps[0])));
                                                    var _form_data = bt.render_form_line({ title: ' ', class: 'checks_line label-input-group', items: [{ name: 'force', type: 'checkbox',value: true, text: lan.site.dns_check_tips5 }] });
                                                    $(obj).parents('.line').append(_form_data.html);

                                                    $('#ymlist li input[type="checkbox"]').each(function () {
                                                        if ($(this).val().indexOf('*') >= 0) {
                                                            $(this).parents('li').hide();
                                                        }
                                                    })
                                                }
                                            },
                                            {
                                                name: 'check_dns', text: lan.site.check_dns, type: 'radio', callback: function (obj) {
                                                    $('.checks_line').remove();
                                                    $(obj).siblings().removeAttr('checked');
                                                    $('.help-info-text').html($(bt.render_help(helps[1])));
                                                    $('#ymlist li').show();

                                                    var arrs_list = [], arr_obj = {};
                                                    bt.site.get_dns_api(function (api) {
                                                        for (var x = 0; x < api.length; x++) {
                                                            arrs_list.push({ title: api[x].title, value: api[x].name });
                                                            arr_obj[api[x].name] = api[x];
                                                        }
                                                        var data = [{
                                                            title: lan.site.choose_dns, class: 'checks_line', items: [
                                                                {
                                                                    name: 'dns_select', width: '120px', type: 'select', items: arrs_list, callback: function (obj) {
                                                                        var _val = obj.val();
                                                                        $('.set_dns_config').remove();
                                                                        var _val_obj = arr_obj[_val];
                                                                        var _form = {
                                                                            title: '',
                                                                            area: '530px',
                                                                            list: [],
                                                                            btns: [{ title: lan.site.turn_off, name: 'close' }]
                                                                        };

                                                                        var helps = [];
                                                                        if (_val_obj.data !== false) {
                                                                            _form.title = lan.site.set+'【' + _val_obj.title + '】'+lan.site.interface;
                                                                            helps.push(_val_obj.help);
                                                                            var is_hide = true;
                                                                            for (var i = 0; i < _val_obj.data.length; i++) {
                                                                                _form.list.push({ title: _val_obj.data[i].name, name: _val_obj.data[i].key, value: _val_obj.data[i].value })
                                                                                if (!_val_obj.data[i].value) is_hide = false;
                                                                            }
                                                                            _form.btns.push({
                                                                                title: lan.site.save, css: 'btn-success', name: 'btn_submit_save', callback: function (ldata, load) {
                                                                                    bt.site.set_dns_api({ pdata: JSON.stringify(ldata) }, function (ret) {
                                                                                        if (ret.status) {
                                                                                            load.close();
                                                                                            robj.find('input[type="radio"]:eq(0)').trigger('click')
                                                                                            robj.find('input[type="radio"]:eq(1)').trigger('click')
                                                                                        }
                                                                                        bt.msg(ret);
                                                                                    })
                                                                                }
                                                                            })
                                                                            if (is_hide) {
                                                                                obj.after('<button class="btn btn-default btn-sm mr5 set_dns_config">'+lan.site.set+'</button>');
                                                                                $('.set_dns_config').click(function () {
                                                                                    var _bs = bt.render_form(_form);
                                                                                    $('div[data-id="form' + _bs + '"]').append(bt.render_help(helps));
                                                                                })
                                                                            } else {
                                                                                var _bs = bt.render_form(_form);
                                                                                $('div[data-id="form' + _bs + '"]').append(bt.render_help(helps));
                                                                            }
                                                                        }
                                                                    }
                                                                },
                                                            ]
                                                        }
                                                            , {
                                                                title: ' ', class: 'checks_line label-input-group', items:
                                                                    [
                                                                        { css: 'label-input-group ptb10', text: 'Automatically combine pan-domain names', name: 'app_root', type: 'checkbox' }
                                                                    ]
                                                            }
                                                       ]
                                                        for (var i = 0; i < data.length; i++) {
                                                            var _form_data = bt.render_form_line(data[i]);
                                                            $(obj).parents('.line').append(_form_data.html)
                                                            bt.render_clicks(_form_data.clicks);
                                                        }
                                                    })
                                                }
                                            },
                                        ]
                                    },
                                    { title: lan.site.admin_email, name: 'admin_email', value: rdata.email, width: '260px' }
                                ]

                                for (var i = 0; i < datas.length; i++) {
                                    var _form_data = bt.render_form_line(datas[i]);
                                    robj.append(_form_data.html);
                                    bt.render_clicks(_form_data.clicks);
                                }
                                var _ul = $('<ul id="ymlist" class="domain-ul-list"></ul>');
                                for (var i = 0; i < ddata.domains.length; i++) {
                                    if (ddata.domains[i].binding === true) continue
                                    _ul.append('<li style="cursor: pointer;"><input class="checkbox-text" type="checkbox" value="' + ddata.domains[i].name + '">' + ddata.domains[i].name + '</li>');
                                }
                                var _line = $("<div class='line mtb10'></div>");
                                _line.append('<span class="tname text-center">'+lan.site.domain+'</span>');
                                _line.append(_ul);
                                robj.append(_line);
                                robj.find('input[type="radio"]').parent().addClass('label-input-group ptb10');
                                $("#ymlist li input").click(function (e) {
                                    e.stopPropagation();
                                })
                                $("#ymlist li").click(function () {

                                    var o = $(this).find("input");
                                    if (o.prop("checked")) {
                                        o.prop("checked", false)
                                    }
                                    else {
                                        o.prop("checked", true);
                                    }
                                })
                                var _btn_data = bt.render_form_line({
                                    title: ' ', text: lan.site.btapply, name: 'letsApply', type: 'button', callback: function (ldata) {
                                        ldata['domains'] = [];
                                        $('#ymlist input[type="checkbox"]:checked').each(function () {
                                            ldata['domains'].push($(this).val())
                                        })
                                        var ddata = {
                                            siteName: web.name,
                                            email: ldata.admin_email,
                                            updateOf: 1,
                                            domains: JSON.stringify(ldata['domains'])
                                        }
                                        if (ddata.email.indexOf('@') === -1) {
                                            layer.msg('Admin email cannot be empty!', {icon:2});
                                            return;
                                        }

                                        if (ldata.check_file) {
                                            ddata['force'] = ldata.force;
                                            site.create_let(ddata, function (res) {
                                                if (res.status === true) {
                                                    site.reload();
                                                }

                                            });
                                        }
                                        else {
                                            ddata['dnsapi'] = ldata.dns_select;
                                            ddata['dnssleep'] = ldata.dnssleep;
                                            ddata['app_root'] = ldata.app_root ? 1 : 0;
                                            site.create_let(ddata, function (ret) {
                                                if (ldata.dns_select == 'dns') {
                                                    if (ret.key) {
                                                        site.reload();
                                                        bt.msg(ret);
                                                        return;
                                                    }
                                                    var b_load = bt.open({
                                                        type: 1,
                                                        area: '700px',
                                                        title: lan.site.resolve_txt,
                                                        closeBtn: 2,
                                                        shift: 5,
                                                        shadeClose: false,
                                                        content: "<div class='divtable pd15 div_txt_jx'><p class='mb15' >"+lan.site.resolve_txt_by_list+":</p><table id='dns_txt_jx' class='table table-hover'></table><div class='text-right mt10'><button class='btn btn-success btn-sm btn_check_txt' >"+lan.site.check+"</button></div></div>"
                                                    });
                                                    setTimeout(function () {
                                                        var data = [];
                                                        for (var j = 0; j < ret.dns_names.length; j++) data.push({ name: ret.dns_names[j].acme_name, txt: ret.dns_names[j].domain_dns_value });
                                                        bt.render({
                                                            table: '#dns_txt_jx',
                                                            columns: [
                                                                { field: 'name',width: '220px', title: lan.site.resolve_domain },
                                                                { field: 'txt', width: '70px', title: lan.site.txt },
                                                            ],
                                                            data: data
                                                        })
                                                        if (ret.dns_names.length == 0) ret.dns_names.append('_acme-challenge.bt.cn')
                                                        $('.div_txt_jx').append(bt.render_help([lan.site.dns_resolve_tips4, lan.site.dns_resolve_tips2 + ret.dns_names[0].acme_name, lan.site.dns_resolve_tips3]));

                                                        $('.btn_check_txt').click(function () {
                                                            var new_data = {
                                                                siteName: web.name,
                                                                domains: ddata.domains,
                                                                updateOf: 1,
                                                                email: ldata.email,
                                                                renew: 'True',
                                                                dnsapi:'dns'
                                                            }
                                                            site.create_let(new_data, function (ldata) {
                                                                if (ldata.status) {
                                                                    b_load.close();
                                                                    site.ssl.reload(1);
                                                                }
                                                            });
                                                        })
                                                    }, 100)
                                                }
                                                else {
                                                    site.reload();
                                                    bt.msg(ret);
                                                }
                                            })
                                        }
                                    }
                                });
                                robj.append(_btn_data.html);
                                bt.render_clicks(_btn_data.clicks);

                                robj.append(bt.render_help(helps[0]));
                                robj.find('input[type="radio"]:eq(0)').trigger('click')
                            })
                        }
                    },
                    {
                        title: lan.site.other_ssl, callback: function (robj) {
                            var cert_info = '';
                            if (rdata.cert_data['notBefore']) {
                                cert_info = '<div style="margin-bottom: 10px;" class="alert alert-success">\
                                        <p style="margin-bottom: 9px;"><span style="width: 357px;display: inline-block;">'+ (rdata.status ? lan.site.deploy_success_tips :lan.site.not_deploy_and_save)+'</span>\
                                        <span style="margin-left: 20px;display: inline-block;overflow: hidden;text-overflow: ellipsis;white-space: nowrap;max-width: 138px;width: 140px;">\
                                        <b>'+lan.site.cert_brand+'</b>'+ rdata.cert_data.issuer + '</span></p>\
                                        <span style="display:inline-block;max-width: 357px;overflow:hidden;text-overflow:ellipsis;vertical-align:-3px;white-space: nowrap;width: 357px;"><b>'+lan.site.auth_domain+'</b> ' + rdata.cert_data.dns.join('、') + '</span>\
                                        <span style="margin-left: 20px;"><b>'+lan.site.expire_time+'</b> ' + rdata.cert_data.notAfter + '</span></div>'
                            }
                            robj.append('<div>' + cert_info+'<div><span>'+lan.site.ssl_key+'</span><span style="padding-left:194px">'+lan.site.ssl_crt+'</span></div></div>');
                            var datas = [
                                {
                                    items: [
                                        { name: 'key', width: '45%', height: '220px', type: 'textarea', value: rdata.key },
                                        { name: 'csr', width: '45%', height: '220px', type: 'textarea', value: rdata.csr }
                                    ]
                                },
                                {
                                    items: [
                                        {
                                            text: lan.site.save, name: 'btn_ssl_save', type: 'button', callback: function (sdata) {
                                                bt.site.set_ssl(web.name, sdata, function (ret) {
                                                    if (ret.status) site.reload(7);
                                                    bt.msg(ret);
                                                })
                                            }
                                        },
                                        {
                                            text: lan.site.ssl_close, name: 'btn_ssl_close', hide: !rdata.status, type: 'button', callback: function (sdata) {
                                                site.ssl.set_ssl_status('CloseSSLConf', web.name);
                                            }
                                        }
                                    ]
                                }
                            ]
                            for (var i = 0; i < datas.length; i++) {
                                var _form_data = bt.render_form_line(datas[i]);
                                robj.append(_form_data.html);
                                bt.render_clicks(_form_data.clicks);
                            }
                            var helps = [
                                            lan.site.bt_ssl_help_10,
                                            lan.public_backup.cret_err,
                                            lan.public_backup.pem_format,
                                            lan.site.ssl_tips5,
                            ]
                            robj.append(bt.render_help(helps));

                        }
                    },
                    {
                        title: lan.site.turn_off, callback: function (robj) {
                            if (rdata.type == -1) {
                                robj.html("<div class='mtb15' style='line-height:30px'>" + lan.site.ssl_help_1 + "</div>");
                                return;
                            };
                            var txt = '';
                            switch (rdata.type) {
                                case 1:
                                    txt = "Let's Encrypt";
                                    break;
                                case 0:
                                    txt = lan.site.other_ssl;
                                    break;
                                case 2:
                                    txt = lan.site.bt_ssl;
                                    break;
                            }
                            $(".tab-con").html("<div class='line mtb15'>" + lan.get('ssl_enable', [txt]) + "</div><div class='line mtb15'><button class='btn btn-success btn-sm' onclick=\"site.ssl.set_ssl_status('CloseSSLConf','" + web.name + "')\">" + lan.site.ssl_close + "</button></div>");

                        }
                    },
                    {
                        title: lan.site.ssl_dir, callback: function (robj) {
                            robj.html("<div class='divtable' style='height:510px;'><table id='cer_list_table' class='table table-hover'></table></div>");
                            bt.site.get_cer_list(function (rdata) {
                                bt.render({
                                    table: '#cer_list_table',
                                    columns: [
                                        {
                                            field: 'subject', title: lan.site.domain, templet: function (item) {
                                                return item.dns.join('<br>')
                                            }
                                        },
                                        { field: 'notAfter', width: '100px', title: lan.site.endtime },
                                        { field: 'issuer', width: '150px', title: lan.site.brand },
                                        {
                                            field: 'opt', width: '75px', align: 'right', title: lan.site.operate, templet: function (item) {
                                                var opt = '<a class="btlink" onclick="bt.site.set_cert_ssl(\'' + item.subject + '\',\'' + web.name + '\',function(rdata){if(rdata.status){site.ssl.reload(2);}})" href="javascript:;">'+lan.site.deploy+'</a> | ';
                                                opt += '<a class="btlink" onclick="bt.site.remove_cert_ssl(\'' + item.subject + '\',function(rdata){if(rdata.status){site.ssl.reload(4);}})" href="javascript:;">'+lan.site.del+'</a>'
                                                return opt;
                                            }
                                        }
                                    ],
                                    data: rdata
                                })
                            })
                        }
                    }
                ]
                bt.render_tab('ssl_tabs', _tabs);
                $('#ssl_tabs').append('<div class="ss-text pull-right mr30" style="position: relative;top:-4px"><em>'+lan.site.force_https+'</em><div class="ssh-item"><input class="btswitch btswitch-ios" id="toHttps" type="checkbox"><label class="btswitch-btn" for="toHttps"></label></div></div>');
                $("#toHttps").attr('checked', rdata.httpTohttps);
                $('#toHttps').click(function (sdata) {
                    var isHttps = $("#toHttps").attr('checked');
                    if (isHttps) {
                        layer.confirm('After closing HTTPS, you need to clear your browser cache to see the effect. Continue?', { icon: 3, title: "Turn off forced HTTPS\"" }, function () {
                            bt.site.close_http_to_https(web.name, function (rdata) {
                                if (rdata.status) {
                                    setTimeout(function () {
                                        site.reload(7);
                                    }, 3000);
                                }
                            })
                        });
                    }
                    else {
                        bt.site.set_http_to_https(web.name, function (rdata) {
                            if (!rdata.status) {
                                setTimeout(function () {
                                    site.reload(7);
                                }, 3000);
                            }

                        })
                    }
                })
                switch (rdata.type) {
                    case 1:
                        $('#ssl_tabs span:eq(1)').trigger('click');
                        break;
                    case 0:
                        $('#ssl_tabs span:eq(2)').trigger('click');
                        break;
                    default:
                        $('#ssl_tabs span:eq(0)').trigger('click');
                        break;
                }

            })
        },
        set_php_version: function (web) {
            bt.site.get_site_phpversion(web.name, function (sdata) {
                if (sdata.status === false) {
                    bt.msg(sdata);
                    return;
                }
                bt.site.get_all_phpversion(function (vdata) {
                    var versions = [];
                    for (var j = vdata.length - 1; j >= 0; j--) {
                        var o = vdata[j];
                        o.value = o.version;
                        o.title = o.name;
                        versions.push(o);
                    }
                    var data = {
                        items: [
                            { title: lan.site.php_ver, name: 'versions', value: sdata.phpversion, type: 'select', items: versions },
                            {
                                text: lan.site.switch, name: 'btn_change_phpversion', type: 'button', callback: function (pdata) {
                                    bt.site.set_phpversion(web.name, pdata.versions, function (ret) {
                                        if (ret.status) site.reload(8)
                                        bt.msg(ret);
                                    })
                                }
                            }
                        ]
                    }
                    var _form_data = bt.render_form_line(data);
                    var _html = $(_form_data.html);
                    _html.append(bt.render_help([lan.site.switch_php_help1, lan.site.switch_php_help2, lan.site.switch_php_help3]));
                    $('#webedit-con').append(_html);
                    bt.render_clicks(_form_data.clicks);
                })
            })
        },
        templet_301: function (sitename, id, types, obj) {
            if (types) {
                obj = {
                    redirectname:(new Date()).valueOf(),
                    tourl: 'http://',
                    redirectdomain: [],
                    redirectpath: '',
                    redirecttype: '',
                    type: 1,
                    domainorpath: 'domain',
                    holdpath: 1
                }
            }
            var helps = [
                lan.site.redirect_tips1,
                lan.site.redirect_tips2,
                lan.site.redirect_tips3,
                lan.site.redirect_tips4,
                lan.site.redirect_tips5,
                lan.site.redirect_tips6
            ];
            bt.site.get_domains(id, function (rdata) {
                var domain_html = ''
                for (var i = 0; i < rdata.length; i++) {
                    domain_html += '<option value="' + rdata[i].name + '">' + rdata[i].name + '</option>';
                }
                var form_redirect = bt.open({
                    type: 1,
                    skin: 'demo-class',
                    area: '650px',
                    title: types ? lan.site.create_redirect : lan.site.modify_redirect+'[' + obj.redirectname + ']',
                    closeBtn: 2,
                    shift: 5,
                    shadeClose: false,
                    content: "<form id='form_redirect' class='divtable pd20' style='padding-bottom: 60px'>" +
                        "<div class='line' style='overflow:hidden;height: 40px;'>" +
                        "<span class='tname' style='position: relative;top: -5px;'>"+lan.site.open_redirect+"</span>" +
                        "<div class='info-r  ml0 mt5' >" +
                        "<input class='btswitch btswitch-ios' id='type' type='checkbox' name='type' " + (obj.type == 1 ? 'checked="checked"' : '') + " /><label class='btswitch-btn phpmyadmin-btn' for='type' style='float:left'></label>" +
                        "<div style='display: inline-block;'>" +
                        "<span class='tname' style='margin-left:10px;position: relative;top: -5px; width:150px;'>"+lan.site.reserve_url+"</span>" +
                        "<input class='btswitch btswitch-ios' id='holdpath' type='checkbox' name='holdpath' " + (obj.holdpath == 1 ? 'checked="checked"' : '') + " /><label class='btswitch-btn phpmyadmin-btn' for='holdpath' style='float:left'></label>" +
                        "</div>" +
                        "</div>" +
                        "</div>" +
                        "<div class='line' style='clear:both;display:none;'>" +
                        "<span class='tname'>"+lan.site.redirect_name+"</span>" +
                        "<div class='info-r  ml0'><input name='redirectname' class='bt-input-text mr5' " + (types ? '' : 'disabled="disabled"') + " type='text' style='width:300px' value='" + obj.redirectname + "'></div>" +
                        "</div>" +
                        "<div class='line' style='clear:both;'>" +
                        "<span class='tname'>"+lan.site.redirect_type+"</span>" +
                        "<div class='info-r  ml0'>" +
                        "<select class='bt-input-text mr5' name='domainorpath' style='width:100px'><option value='domain' " + (obj.domainorpath == 'domain' ? 'selected ="selected"' : "") + ">"+lan.site.domain+"</option><option value='path'  " + (obj.domainorpath == 'path' ? 'selected ="selected"' : "") + ">"+lan.site.path+"</option></select>" +
                        "<span class='mlr15'>"+lan.site.redirect_mode+"</span>" +
                        "<select class='bt-input-text ml10' name='redirecttype' style='width:100px'><option value='301' " + (obj.redirecttype == '301' ? 'selected ="selected"' : "") + " >301</option><option value='302' " + (obj.redirecttype == '302' ? 'selected ="selected"' : "") + ">302</option></select></div>" +
                        "</div>" +
                        "<div class='line redirectdomain' style='display:" + (obj.domainorpath == 'domain' ? 'block' : 'none') + "'>" +
                        "<span class='tname'>"+lan.site.redirect_domain+"</span>" +
                        "<div class='info-r  ml0'>" +
                        "<select id='usertype' name='redirectdomain' data-actions-box='true' class='selectpicker show-tick form-control' multiple data-live-search='false'>" + domain_html + "</select>" +
                        "<span class='tname' style='width:90px'>"+lan.site.target_url+"</span>" +
                        "<input  name='tourl' class='bt-input-text mr5' type='text' style='width:200px' value='" + obj.tourl + "'>" +
                        "</div>" +
                        "</div>" +
                        "<div class='line redirectpath' style='display:" + (obj.domainorpath == 'path' ? 'block' : 'none') + "'>" +
                        "<span class='tname'>"+lan.site.redirect_path+"</span>" +
                        "<div class='info-r  ml0'>" +
                        "<input  name='redirectpath' class='bt-input-text mr5' type='text' style='width:200px;float: left;margin-right:0px' value='" + obj.redirectpath + "'>" +
                        "<span class='tname' style='width:90px'>"+lan.site.target_url+"</span>" +
                        "<input  name='tourl1' class='bt-input-text mr5' type='text' style='width:200px' value='" + obj.tourl + "'>" +
                        "</div>" +
                        "</div>" +
                        "<ul class='help-info-text c7'>" + bt.render_help(helps) + '</ul>' +
                        "<div class='bt-form-submit-btn'><button type='button' class='btn btn-sm btn-danger btn-colse-prosy'>"+lan.site.turn_off+"</button><button type='button' class='btn btn-sm btn-success btn-submit-redirect'>" + (types ? " "+lan.site.submit : lan.site.save) + "</button></div>" +
                        "</form>"
                });
                setTimeout(function () {
                    $('.selectpicker').selectpicker({
                        'noneSelectedText': lan.site.choose_domain,
                        'selectAllText': lan.site.choose_all,
                        'deselectAllText': lan.site.cancel_all
                    });
                    $('.selectpicker').selectpicker('val', obj.redirectdomain);
                    $('#form_redirect').parent().css('overflow', 'inherit');
                    $('[name="domainorpath"]').change(function () {
                        if ($(this).val() == 'path') {
                            $('.redirectpath').show();
                            $('.redirectdomain').hide();
                            $('.selectpicker').selectpicker('val', []);
                        } else {
                            $('.redirectpath').hide();
                            $('.redirectdomain').show();
                            $('[name="redirectpath"]').val('')
                        }
                    });
                    $('.btn-colse-prosy').click(function () {
                        form_redirect.close();
                    });
                    $('.btn-submit-redirect').click(function () {
                        var type = $('[name="type"]').prop('checked') ? 1 : 0;
                        var holdpath = $('[name="holdpath"]').prop('checked') ? 1 : 0;
                        var redirectname = $('[name="redirectname"]').val();
                        var redirecttype = $('[name="redirecttype"]').val();
                        var domainorpath = $('[name="domainorpath"]').val();
                        var redirectpath = $('[name="redirectpath"]').val();
                        var redirectdomain = JSON.stringify($('.selectpicker').val() || []);
                        var tourl = $(domainorpath == 'path' ? '[name="tourl1"]' : '[name="tourl"]').val();
                        if (!types) {
                            bt.site.modify_redirect({
                                type: type,
                                sitename: sitename,
                                holdpath: holdpath,
                                redirectname: redirectname,
                                redirecttype: redirecttype,
                                domainorpath: domainorpath,
                                redirectpath: redirectpath,
                                redirectdomain: redirectdomain,
                                tourl: tourl
                            }, function (rdata) {
                                if (rdata.status) {
                                    form_redirect.close();
                                    site.reload(11);
                                }
                                bt.msg(rdata);
                            });
                        } else {
                            bt.site.create_redirect({
                                type: type,
                                sitename: sitename,
                                holdpath: holdpath,
                                redirectname: redirectname,
                                redirecttype: redirecttype,
                                domainorpath: domainorpath,
                                redirectpath: redirectpath,
                                redirectdomain: redirectdomain,
                                tourl: tourl
                            }, function (rdata) {
                                if (rdata.status) {
                                    form_redirect.close();
                                    site.reload(11);
                                }
                                bt.msg(rdata);
                            });
                        }
                    });
                }, 100);
            });

        },
        set_301_old:function(web){
            bt.site.get_domains(web.id,function(rdata){
                var domains = [{title:lan.site.site,value:'all'}];
                for(var i=0;i<rdata.length;i++) domains.push({title:rdata[i].name,value:rdata[i].name});

                bt.site.get_site_301(web.name,function(pdata){
                    var _val = pdata.src==''?'all':pdata.src
                    var datas = [
                        {title: lan.site.access_domain,width:'360px',name:'domains',value:_val,disabled:pdata.status,type:'select',items:domains},
                        {title: lan.site.target_url,width:'360px',name:'toUrl',value:pdata.url},
                        {title:' ', text: lan.site.enable_301,value:pdata.status,name:'status',class:'label-input-group',type:'checkbox',callback:function(sdata){
                            bt.site.set_site_301(web.name,sdata.domains,sdata.toUrl,sdata.status?'1':'0',function(ret){
                                if(ret.status) site.reload(10)
                                bt.msg(ret);
                            })
                        }},
                    ]
                    var robj = $('#webedit-con');
                    for(var i=0;i<datas.length;i++){
                        var _form_data = bt.render_form_line(datas[i]);
                        robj.append(_form_data.html);
                        bt.render_clicks(_form_data.clicks);
                    }
                    robj.append(bt.render_help([lan.site.to301_help_1,lan.site.to301_help_2]));
                })
            })
        },
        set_301: function (web) {
            bt.site.get_redirect_list(web.name, function (rdata) {
                var datas = {
                    items: [{ name: 'add_proxy', text: lan.site.add_redirect, type: 'button', callback: function (data) { site.edit.templet_301(web.name, web.id, true) } }]
                }
                var form_line = bt.render_form_line(datas);
                $('#webedit-con').append(form_line.html);
                bt.render_clicks(form_line.clicks);
                $('#webedit-con').addClass('divtable').append('<table id="proxy_list" class="table table-hover"></table>');
                setTimeout(function () {
                    var _tab = bt.render({
                        table: '#proxy_list',
                        columns: [
                            // { field: 'redirectname', title: '名称' },
                            {
                                field: '', title: lan.site.redirect_type, templet: function (item) {
                                    var conter = '';
                                    if (item.domainorpath == 'path') {
                                        conter = item.redirectpath;
                                    } else {
                                        conter = item.redirectdomain ? item.redirectdomain.join('、') : lan.site.empty
                                    }
                                    return '<span style="width:100px;" title="' + conter + '">' + conter + '</span>';
                                }
                            },
                            { field: 'redirecttype', title: lan.site.redirect_mode },
                            {
                                field: 'holdpath', index: true, title: lan.site.reserve_url, templet: function (item) {
                                    return '<a href="javascript:;" class="btlink set_path_state" style="display:" data-stuats="' + (item.holdpath == 1 ? 0 : 1) + '">' + (item.holdpath == 1 ? '<span style="color:#20a53a;" class="set_path_state">'+lan.site.turn_on+'</span>' : '<span style="color:red;" class="set_path_state">'+lan.site.turn_off+'</span>') + '</a>';
                                }
                            },
                            {
                                field: 'type', title: lan.site.status, index: true, templet: function (item) {
                                    return '<a href="javascript:;" class="btlink set_type_state" style="display:" data-stuats="' + (item.type == 1 ? 0 : 1) + '">' + (item.type == 1 ? '<span style="color:#20a53a;">'+lan.site.running_text+'</span><span style="color:#5CB85C" class="glyphicon glyphicon-play"></span>' : '<span style="color:red;">'+lan.site.already_stop+'</span><span style="color:red" class="glyphicon glyphicon-pause"></span>') + '</a>'
                                }
                            },
                            {
                                field: '', title: lan.site.operate, align: 'right', index: true, templet: function (item) {
                                    var redirectname = item.redirectname;
                                    var sitename = item.sitename;
                                    var conter = '<a class="btlink open_config_file" href="javascript:;">'+lan.site.site_menu_6+'</a> ' +
                                        '| <a class="btlink edit_redirect"  href="javascript:;">'+lan.site.edit+'</a> ' +
                                        '| <a class="btlink" onclick="bt.site.remove_redirect(\'' + sitename + '\',\'' + redirectname + '\',function(rdata){if(rdata.status)site.reload(11)})" href="javascript:;">'+lan.site.del+'</a>';
                                    return conter
                                }
                            }
                        ],
                        data: rdata
                    });

                    $('.edit_redirect').click(function () {
                        var index = parseInt($(this).parent().attr('data-index'));
                        site.edit.templet_301(web.name, web.id, false, rdata[index]);
                    });
                    $('.open_config_file').click(function () {
                        var index = $(this).parent().attr('data-index');
                        var sitename = web.name;
                        var redirectname = rdata[index].redirectname;
                        var redirect_config = '';
                        bt.site.get_redirect_config({
                            sitename: sitename,
                            redirectname: redirectname,
                            webserver: bt.get_cookie('serverType')
                       }, function (rdata) {
                            if (typeof rdata == 'object' && rdata.constructor == Array) {
                                if (!rdata[0].status) bt.msg(rdata)
                            } else {
                                if (!rdata.status) bt.msg(rdata)
                            }
                            var datas = [
                                { items: [{ name: 'redirect_configs', type: 'textarea', value: rdata[0].data, widht: '340px', height: '200px' }] },
                                {
                                    name: 'btn_config_submit', text: lan.site.save, type: 'button', callback: function (ddata) {
                                        bt.site.save_redirect_config({ path: rdata[1], data: editor.getValue(), encoding: rdata[0].encoding }, function (ret) {
                                            if (ret.status) {
                                                site.reload(11);
                                                redirect_config.close();
                                            }
                                            bt.msg(ret);
                                        })
                                    }
                                }
                            ]
                            redirect_config = bt.open({
                                type: 1,
                                area: ['550px', '550px'],
                                title: lan.site.edit_conf+'[' + redirectname + ']',
                                closeBtn: 2,
                                shift: 0,
                                content: "<div class='bt-form'><div id='redirect_config_con' class='pd15'></div></div>"
                            })
                            var robj = $('#redirect_config_con');
                            for (var i = 0; i < datas.length; i++) {
                                var _form_data = bt.render_form_line(datas[i]);
                                robj.append(_form_data.html);
                                bt.render_clicks(_form_data.clicks);
                            }
                            robj.append(bt.render_help([lan.site.load_conf]));
                            $('textarea.redirect_configs').attr('id', 'configBody');
                            var editor = CodeMirror.fromTextArea(document.getElementById("configBody"), {
                                extraKeys: { "Ctrl-Space": "autocomplete" },
                                lineNumbers: true,
                                matchBrackets: true
                            });
                            $(".CodeMirror-scroll").css({ "height": "350px", "margin": 0, "padding": 0 });
                            setTimeout(function () {
                                editor.refresh();
                            }, 250);
                        });
                    });
                    $('.set_path_state').click(function () {
                        type_edit_redirect($(this), 'holdpath')
                    });
                    $('.set_type_state').click(function () {
                        type_edit_redirect($(this), 'type');
                    });
                    function type_edit_redirect(_this, type) {
                        var index = _this.parent().attr('data-index');
                        var status = _this.attr('data-stuats');
                        var item = rdata[index];
                        item[type] = status;
                        item['redirectdomain'] = JSON.stringify(item['redirectdomain']);
                        // item['redirectdomain'] = JSON.stringify(['redirectdomain']);
                        bt.site.modify_redirect(item, function (res) {
                            if (res.status) site.reload(11);
                            bt.msg(res);
                        });
                    }
                }, 100);
            });
        },
        templet_proxy: function (sitename, type, obj) {
            if (type) {
                obj = { "type": 1, "cache": 0, "proxyname": "", "proxydir": "/", "proxysite": "http://", "cachetime": 1, "todomain": "$host", "subfilter": [{ "sub1": "", "sub2": "" }] };
            }
            var sub_conter = '';
            for (var i = 0; i < obj.subfilter.length; i++) {
                if (i == 0 || obj.subfilter[i]['sub1'] != '') {
                    sub_conter += "<div class='sub-groud'>" +
                        "<input name='rep" + ((i + 1) * 2 - 1) + "' class='bt-input-text mr10' placeholder='"+lan.site.con_rep_info+"' type='text' style='width:200px' value='" + obj.subfilter[i]['sub1'] + "'>" +
                        "<input name='rep" + ((i + 1) * 2) + "' class='bt-input-text ml10' placeholder='"+lan.site.to_con+"' type='text' style='width:200px' value='" + obj.subfilter[i]['sub2'] + "'>" +
                        "<a href='javascript:;' class='proxy_del_sub' style='color:red;'>Del</a>" +
                        "</div>";
                }
                if (i == 2) $('.add-replace-prosy').attr('disabled', 'disabled')
            }
            var helps = [
                        lan.site.proxy_tips1,
                        lan.site.proxy_tips2,
                        lan.site.proxy_tips3,
                        lan.site.proxy_tips4
            ];
            var form_proxy = bt.open({
                type: 1,
                skin: 'demo-class',
                area: '650px',
                title: type ? lan.site.create_proxy : lan.site.modify_proxy+'[' + obj.proxyname + ']',
                closeBtn: 2,
                shift: 5,
                shadeClose: false,
                content: "<form id='form_proxy' class='divtable pd15' style='padding-bottom: 60px'>" +
                    "<div class='line' style='overflow:hidden'>" +
                    "<span class='tname' style='position: relative;top: -5px;'>"+lan.site.open_proxy+"</span>" +
                    "<div class='info-r  ml0 mt5' >" +
                    "<input class='btswitch btswitch-ios' id='openVpn' type='checkbox' name='type' " + (obj.type == 1 ? 'checked="checked"' : '') + "><label class='btswitch-btn phpmyadmin-btn' for='openVpn' style='float:left'></label>" +
                    "<div style='display:" + (bt.get_cookie('serverType') == 'nginx' ? ' inline-block' : 'none') + "'>" +
                    "<span class='tname' style='margin-left:15px;position: relative;top: -5px;'>"+lan.site.proxy_cache+"</span>" +
                    "<input class='btswitch btswitch-ios' id='openNginx' type='checkbox' name='cache' " + (obj.cache == 1 ? 'checked="checked"' : '') + "'><label class='btswitch-btn phpmyadmin-btn' for='openNginx'></label>" +
                    "</div>" +
                    "<div style='display: inline-block;'>" +
                    "<span class='tname' style='margin-left:10px;position: relative;top: -5px;width:150px;'>"+lan.site.proxy_adv+"</span>" +
                    "<input class='btswitch btswitch-ios' id='openAdvanced' type='checkbox' name='advanced' " + (obj.advanced == 1 ? 'checked="checked"' : '') + "'><label class='btswitch-btn phpmyadmin-btn' for='openAdvanced'></label>" +
                    "</div>" +
                    "</div>" +
                    "</div>" +
                    "<div class='line' style='clear:both;'>" +
                    "<span class='tname'>"+lan.site.proxy_name+"</span>" +
                    "<div class='info-r  ml0'><input name='proxyname'" + (type ? "" : "readonly='readonly'") + " class='bt-input-text mr5 " + (type ? "" : " disabled") + "' type='text' style='width:200px' value='" + obj.proxyname + "'></div>" +
                    "</div>" +
                    "<div class='line cachetime' style='display:" + (obj.cache == 1 ? 'block' : 'none') + "'>" +
                    "<span class='tname'>"+lan.site.cache_time+"</span>" +
                    "<div class='info-r  ml0'><input name='cachetime'class='bt-input-text mr5' type='text' style='width:200px' value='" + obj.cachetime + "'>"+lan.site.minute+"</div>" +
                    "</div>" +
                    "<div class='line advanced'  style='display:" + (obj.advanced == 1 ? 'block' : 'none') + "'>" +
                    "<span class='tname'>"+lan.site.proxy_dir+"</span>" +
                    "<div class='info-r  ml0'><input id='proxydir' name='proxydir' class='bt-input-text mr5' type='text' style='width:200px' value='" + obj.proxydir + "'>" +
                    "</div>" +
                    "</div>" +
                    "<div class='line'>" +
                    "<span class='tname'>"+lan.site.target_url+"</span>" +
                    "<div class='info-r  ml0'>" +
                    "<input name='proxysite' class='bt-input-text mr10' type='text' style='width:200px' value='" + obj.proxysite + "'>" +
                    "<span class='mlr15'>"+lan.site.proxy_domain+"</span><input name='todomain' class='bt-input-text ml10' type='text' style='width:200px' value='" + obj.todomain + "'>" +
                    "</div>" +
                    "</div>" +
                    "<div class='line replace_conter' style='display:" + (bt.get_cookie('serverType') == 'nginx' ? 'block' : 'none') + "'>" +
                    "<span class='tname'>"+lan.site.con_rep+"</span>" +
                    "<div class='info-r  ml0 '>" + sub_conter + "</div>" +
                    "</div>" +
                    "<div class='line' style='display:" + (bt.get_cookie('serverType') == 'nginx' ? 'block' : 'none') + "'>" +
                    "<div class='info-r  ml0'>" +
                    "<button class='btn btn-success btn-sm btn-title add-replace-prosy' type='button'><span class='glyphicon cursor glyphicon-plus  mr5' ></span>"+lan.site.add_rep_content+"</button>" +
                    "</div>" +
                    "</div>" +
                    "<ul class='help-info-text c7'>" + bt.render_help(helps) +
                    "<div class='bt-form-submit-btn'><button type='button' class='btn btn-sm btn-danger btn-colse-prosy'>"+lan.site.turn_off+"</button><button type='button' class='btn btn-sm btn-success btn-submit-prosy'>" + (type ? " "+lan.site.submit : lan.site.save) + "</button></div>" +
                    "</form>"
            });
            bt.set_cookie('form_proxy', form_proxy);
            $('.add-replace-prosy').click(function () {
                var length = $(".replace_conter .sub-groud").length;
                if (length == 2) $(this).attr('disabled', 'disabled')
                var conter = "<div class='sub-groud'>" +
                    "<input name='rep" + (length * 2 + 1) + "' class='bt-input-text mr10' placeholder='"+lan.site.con_rep_info+"' type='text' style='width:200px' value=''>" +
                    "<input name='rep" + (length * 2 + 2) + "' class='bt-input-text ml10' placeholder='"+lan.site.to_con+"' type='text' style='width:200px' value=''>" +
                    "<a href='javascript:;' class='proxy_del_sub' style='color:red;'>"+lan.site.del+"</a>" +
                    "</div>"
                $(".replace_conter .info-r").append(conter);
            });
            $('[name="proxysite"]').keyup(function () {
                var val = $(this).val(),ip_reg = /^(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])$/;
                val = val.replace(/^http[s]?:\/\//, '');
				val = val.replace(/:([0-9]*)$/,'');
				if(ip_reg.test(val)){
                	 $("[name='todomain']").val('$host');
				}else{
					 $("[name='todomain']").val(val);
				}
            });
            $('#openAdvanced').click(function () {
                if ($(this).prop('checked')) {
                    $('.advanced').show();
                } else {
                    $('.advanced').hide();
                }
            });
            $('#openNginx').click(function () {
                if ($(this).prop('checked')) {
                    $('.cachetime').show();
                } else {
                    $('.cachetime').hide();
                }
            });
            $('.btn-colse-prosy').click(function () {
                form_proxy.close();
            });
            $('.replace_conter').on('click', '.proxy_del_sub', function () {
                $(this).parent().remove();
                $('.add-replace-prosy').removeAttr('disabled')
            });
            $(".btn-submit-prosy").click(function () {
                var form_proxy_data = {};
                $.each($('#form_proxy').serializeArray(), function () {
                    if (form_proxy_data[this.name]) {
                        if (!form_proxy_data[this.name].push) {
                            form_proxy_data[this.name] = [form_proxy_data[this.name]];
                        }
                        form_proxy_data[this.name].push(this.value || '');
                    } else {
                        form_proxy_data[this.name] = this.value || '';
                    }
                });
                form_proxy_data['type'] = (form_proxy_data['type'] == undefined ? 0 : 1);
                form_proxy_data['cache'] = (form_proxy_data['cache'] == undefined ? 0 : 1);
                form_proxy_data['advanced'] = (form_proxy_data['advanced'] == undefined ? 0 : 1);
                form_proxy_data['sitename'] = sitename;
                form_proxy_data['subfilter'] = JSON.stringify([
                    { 'sub1': form_proxy_data['rep1'] || '', 'sub2': form_proxy_data['rep2'] || '' },
                    { 'sub1': form_proxy_data['rep3'] || '', 'sub2': form_proxy_data['rep4'] || '' },
                    { 'sub1': form_proxy_data['rep5'] || '', 'sub2': form_proxy_data['rep6'] || '' },
                ]);
                for (var i in form_proxy_data) {
                    if (i.indexOf('rep') != -1) {
                        delete form_proxy_data[i];
                    }
                }
                if (type) {
                    bt.site.create_proxy(form_proxy_data, function (rdata) {
                        if (rdata.status) {
                            form_proxy.close();
                            site.reload(12);
                        }
                        bt.msg(rdata);
                    });
                } else {
                    bt.site.modify_proxy(form_proxy_data, function (rdata) {
                        if (rdata.status) {
                            form_proxy.close();
                            site.reload(12);
                        }
                        bt.msg(rdata);
                    });
                }
            });
        },
        set_proxy: function (web) {
            String.prototype.myReplace = function (f, e) {//吧f替换成e
                var reg = new RegExp(f, "g"); //创建正则RegExp对象
                return this.replace(reg, e);
            }
            bt.site.get_proxy_list(web.name, function (rdata) {
                var datas = {
                    items: [{ name: 'add_proxy', text: lan.site.add_proxy, type: 'button', callback: function (data) { site.edit.templet_proxy(web.name, true) } }]
                }
                var form_line = bt.render_form_line(datas);
                $('#webedit-con').append(form_line.html);
                bt.render_clicks(form_line.clicks);
                $('#webedit-con').addClass('divtable').append('<table id="proxy_list" class="table table-hover"></table>');
                setTimeout(function () {
                    var _tab = bt.render({
                        table: '#proxy_list',
                        columns: [
                            {
                                field: 'proxyname', title: lan.site.name, templet: function (item) {
                                    return '<span style="width:60px;" title="' + item.proxyname + '">' + item.proxyname + '</span>'
                                }
                            },
                            {
                                field: 'proxydir', title: lan.site.proxy_dir, templet: function (item) {
                                    return '<span style="width:60px;" title="' + item.proxydir + '">' + item.proxydir + '</span>'
                                }
                            },
                            {
                                field: 'proxysite', title: lan.site.target_url, templet: function (item) {
                                    return '<span style="width:130px;" title="' + item.proxysite + '">' + item.proxysite + '</span>'
                                }
                            },
                            bt.get_cookie('serverType') == 'nginx' ? {
                                field: 'cache', title: lan.site.cache, index: true, templet: function (item, index) {
                                    return '<a href="javascript:;" class="btlink set_nginx_state" data-stuats="' + (item.cache == 1 ? 0 : 1) + '">' + (item.cache == 1 ? '<span style="color:#20a53a;">'+lan.site.already_open+'</span>' : '<span style="color:red;">'+lan.site.already_close+'</span>') + '</a>'
                                }
                            } : '',
                            {
                                field: 'type', title: lan.site.status, index: true, templet: function (item) {
                                    return '<a href="javascript:;" class="btlink set_type_state" style="display:" data-stuats="' + (item.type == 1 ? 0 : 1) + '">' + (item.type == 1 ? '<span style="color:#20a53a;">'+lan.site.running_text+'</span><span style="color:#5CB85C" class="glyphicon glyphicon-play"></span>' : '<span style="color:red;">'+lan.site.already_stop+'</span><span style="color:red" class="glyphicon glyphicon-pause"></span>') + '</a>'
                                }
                            },
                            {
                                field: 'dname', title: lan.site.operate, align: 'right', templet: function (item) {
                                    var proxyname = item.proxyname;
                                    var sitename = item.sitename;
                                    item = JSON.stringify(item).myReplace('"', '\'');
                                    var conter = '<a class="btlink open_config_file" data-name="' + sitename + '" data-proxyname="' + proxyname + '" href="javascript:;">'+lan.site.site_menu_6+'</a> ' +
                                        '| <a class="btlink" onclick="site.edit.templet_proxy(\'' + web.name + '\',false,' + item + ')" href="javascript:;">'+lan.site.edit+'</a> ' +
                                        '| <a class="btlink" onclick="bt.site.remove_proxy(\'' + web.name + '\',\'' + proxyname + '\',function(rdata){if(rdata.status)site.reload(12)})" href="javascript:;">'+lan.site.del+'</a>';
                                    return conter
                                }
                            }
                        ],
                        data: rdata
                    });
                    $('.open_config_file').click(function () {
                        var sitename = $(this).attr('data-name');
                        var proxyname = $(this).attr('data-proxyname');
                        var proxy_config = '';
                        bt.site.get_proxy_config({
                            sitename: sitename,
                            proxyname: proxyname,
                            webserver: bt.get_cookie('serverType')
                        }, function (rdata) {
                            if (typeof rdata == 'object' && rdata.constructor == Array) {
                                if (!rdata[0].status) bt.msg(rdata)
                            } else {
                                if (!rdata.status) bt.msg(rdata)
                            }
                            var datas = [
                                { items: [{ name: 'proxy_configs', type: 'textarea', value: rdata[0].data, widht: '340px', height: '200px' }] },
                                {
                                    name: 'btn_config_submit', text: lan.site.save, type: 'button', callback: function (ddata) {
                                        bt.site.save_proxy_config({ path: rdata[1], data: editor.getValue(), encoding: rdata[0].encoding }, function (ret) {
                                            if (ret.status) {
                                                site.reload(12);
                                                proxy_config.close();
                                            }
                                            bt.msg(ret);
                                        })
                                    }
                                }
                            ]
                            proxy_config = bt.open({
                                type: 1,
                                area: ['550px', '550px'],
                                title: lan.site.edit_conf+'[' + proxyname + ']',
                                closeBtn: 2,
                                shift: 0,
                                content: "<div class='bt-form'><div id='proxy_config_con' class='pd15'></div></div>"
                            })
                            var robj = $('#proxy_config_con');
                            for (var i = 0; i < datas.length; i++) {
                                var _form_data = bt.render_form_line(datas[i]);
                                robj.append(_form_data.html);
                                bt.render_clicks(_form_data.clicks);
                            }
                            robj.append(bt.render_help([lan.site.load_conf]));
                            $('textarea.proxy_configs').attr('id', 'configBody');
                            var editor = CodeMirror.fromTextArea(document.getElementById("configBody"), {
                                extraKeys: { "Ctrl-Space": "autocomplete" },
                                lineNumbers: true,
                                matchBrackets: true
                            });
                            $(".CodeMirror-scroll").css({ "height": "350px", "margin": 0, "padding": 0 });
                            setTimeout(function () {
                                editor.refresh();
                            }, 250);
                        });
                    });
                    $('.set_nginx_state').click(function () {
                        type_edit_proxy($(this), 'cache')
                    });
                    $('.set_type_state').click(function () {
                        type_edit_proxy($(this), 'type');
                    });
                    function type_edit_proxy(_this, type) {
                        var index = _this.parent().attr('data-index');
                        var status = _this.attr('data-stuats');
                        var item = rdata[index];
                        item[type] = status;
                        item['subfilter'] = JSON.stringify(item['subfilter']);
                        bt.site.modify_proxy(item, function (rdata) {
                            if (rdata.status) site.reload(12);
                            bt.msg(rdata);
                        });
                    }
                }, 100);
            });
        },
        set_security: function (web) {
            bt.site.get_site_security(web.id, web.name, function (rdata) {
                var robj = $('#webedit-con');
                var datas = [
                    { title: lan.site.url_suffix, name: 'sec_fix', value: rdata.fix, disabled: rdata.status, width: '360px' },
                    { title: lan.site.access_domain1, name: 'sec_domains', value: rdata.domains, disabled: rdata.status, width: '360px' },

                    {
                        title: ' ', class: 'label-input-group', items: [
                            {
                                text: lan.site.start_anti_leech, name: 'status', value: rdata.status, type: 'checkbox', callback: function (sdata) {
                                    bt.site.set_site_security(web.id, web.name, sdata.sec_fix, sdata.sec_domains, sdata.status, function (ret) {
                                        if (ret.status) site.reload(13)
                                        bt.msg(ret);
                                    })
                                }
                            }
                        ]
                    }
                ]
                for (var i = 0; i < datas.length; i++) {
                    var _form_data = bt.render_form_line(datas[i]);
                    robj.append(_form_data.html);
                    bt.render_clicks(_form_data.clicks);
                }
                var helps = [lan.site.access_empty_ref_default, lan.site.multi_url, lan.site.trigger_return_404]
                robj.append(bt.render_help(helps));
            })
        },
        set_tomact: function (web) {
            bt.site.get_site_phpversion(web.name, function (rdata) {
                var robj = $('#webedit-con');
                if (!rdata.tomcatversion) {
                    robj.html('<font>' + lan.site.tomcat_err_msg1 + '</font>');
                    layer.msg(lan.site.tomcat_err_msg, { icon: 2 });
                    return;
                }
                var data = {
                    class: 'label-input-group', items: [{
                        text: lan.site.enable_tomcat, name: 'tomcat', value: rdata.tomcat == -1 ? false : true, type: 'checkbox', callback: function (sdata) {
                            bt.site.set_tomcat(web.name, function (ret) {
                                if (ret.status) site.reload(9)
                                bt.msg(ret);
                            })
                        }
                    }]
                }
                var _form_data = bt.render_form_line(data);
                robj.append(_form_data.html);
                bt.render_clicks(_form_data.clicks);
                var helps = [lan.site.tomcat_help1 + ' ' + rdata.tomcatversion + ',' + lan.site.tomcat_help2, lan.site.tomcat_help3, lan.site.tomcat_help4, lan.site.tomcat_help5]
                robj.append(bt.render_help(helps));
            })
        },
        get_site_logs: function (web) {
            bt.site.get_site_logs(web.name, function (rdata) {
                var robj = $('#webedit-con');
                var logs = { class: 'bt-logs', items: [{ name: 'site_logs', height: '520px', value: rdata.msg, width: '100%', type: 'textarea' }] };
                var _form_data = bt.render_form_line(logs);
                robj.append(_form_data.html);
                bt.render_clicks(_form_data.clicks);
                $('textarea[name="site_logs"]').attr('readonly', true);
            })
        }
    },
    create_let: function (ddata, callback) {
        bt.site.create_let(ddata, function (ret) {
            if (ret.status) {
                if (callback) {
                    callback(ret);
                }
                else {
                    site.ssl.reload(1);
                    bt.msg(ret);
                    return;
                }
            } else {
                if (!ret.out) {
                    bt.msg(ret);
                    return;
                }
                var data = "<p>" + ret.msg + "</p><hr />"
                if (ret.err[0].length > 10) data += '<p style="color:red;">' + ret.err[0].replace(/\n/g, '<br>') + '</p>';
                if (ret.err[1].length > 10) data += '<p style="color:red;">' + ret.err[1].replace(/\n/g, '<br>') + '</p>';

                layer.msg(data, { icon: 2, area: '500px', time: 0, shade: 0.3, shadeClose: true });
            }
        })
    },
    reload: function (index) {
        if (index == undefined) index = 0

        var _sel = $('.site-menu p.bgw');
        if (_sel.length == 0)  _sel = $('.site-menu p:eq(0)');
        _sel.trigger('click');
    },
    plugin_firewall: function () {
        var typename = bt.get_cookie('serverType');
        var name = 'btwaf_httpd';
        if (typename == "nginx") name = 'btwaf'

        bt.plugin.get_plugin_byhtml(name, function (rhtml) {
            if (rhtml.status === false) return;

            var list = rhtml.split('<script type="javascript/text">');
            if (list.length > 1) {
                rcode = rhtml.split('<script type="javascript/text">')[1].replace("<\/script>", "");
            }
            else {
                list = rhtml.split('<script type="text/javascript">');
                rcode = rhtml.split('<script type="text/javascript">')[1].replace("<\/script>", "");
            }
            rcss = rhtml.split('<style>')[1].split('</style>')[0];
            rcode = rcode.replace('    wafview()','')
            $("body").append('<div style="display:none"><style>' + rcss + '</style><script type="javascript/text">' + rcode + '<\/script></div>');

            setTimeout(function () {
                if (!!(window.attachEvent && !window.opera)) {
                    execScript(rcode);
                } else {
                    window.eval(rcode);
                }
            }, 200)
        })

    },
    web_edit: function (obj) {
        var _this = this;
        var item = $(obj).parents('tr').data('item');
        bt.open({
            type: 1,
            area: ['750px', '650px'],
            title: lan.site.website_change + '[' + item.name + ']  --  ' + lan.site.addtime + '[' + item.addtime + ']',
            closeBtn: 2,
            shift: 0,
            content: "<div class='bt-form'><div class='bt-w-menu site-menu pull-left' style='height: 100%;'></div><div id='webedit-con' class='bt-w-con webedit-con pd15'></div></div>"
        })
        setTimeout(function () {
            var menus = [
                { title: lan.site.domain_man, callback: site.edit.set_domains },
                { title: lan.site.site_menu_1, callback: site.edit.set_dirbind },
                { title: lan.site.site_menu_2, callback: site.edit.set_dirpath },
                { title: lan.site.site_menu_3, callback: site.edit.limit_network },
                { title: lan.site.site_menu_4, callback: site.edit.get_rewrite_list },
                { title: lan.site.site_menu_5, callback: site.edit.set_default_index },
                { title: lan.site.site_menu_6, callback: site.edit.set_config },
                { title: lan.site.site_menu_7, callback: site.edit.set_ssl },
                { title: lan.site.php_ver, callback: site.edit.set_php_version },
                // { title: lan.site.site_menu_9, callback: site.edit.set_tomact },
                { title: lan.site.redirect, callback: site.edit.set_301_old },
                { title: lan.site.redirect_test, callback: site.edit.set_301 },
                { title: lan.site.site_menu_11, callback: site.edit.set_proxy },
                { title: lan.site.site_menu_12, callback: site.edit.set_security },
                { title: lan.site.response_log, callback: site.edit.get_site_logs }
            ]
            for (var i = 0; i < menus.length; i++) {
                var men = menus[i];
                var _p = $('<p>' + men.title + '</p>');
                _p.data('callback', men.callback);
                $('.site-menu').append(_p);
            }
            $('.site-menu p').click(function () {
                $('#webedit-con').html('');
                $(this).addClass('bgw').siblings().removeClass('bgw');
                var callback = $(this).data('callback')
                if (callback) callback(item);
            })
            site.reload(0);
        }, 100)
    }
}
site.get_types();


