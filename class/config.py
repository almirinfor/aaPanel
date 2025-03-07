# coding: utf-8
# +-------------------------------------------------------------------
# | 宝塔Linux面板 x3
# +-------------------------------------------------------------------
# | Copyright (c) 2015-2017 宝塔软件(http://bt.cn) All rights reserved.
# +-------------------------------------------------------------------
# | Author: 黄文良 <287962566@qq.com>
# +-------------------------------------------------------------------

import public,re,sys,os,nginx,apache,json,time
from BTPanel import session,admin_path_checks
from flask import request
class config:

    def getPanelState(self,get):
        return os.path.exists('/www/server/panel/data/close.pl');

    def reload_session(self):
        userInfo = public.M('users').where("id=?",(1,)).field('username,password').find()
        token = public.Md5(userInfo['username'] + '/' + userInfo['password'])
        public.writeFile('/www/server/panel/data/login_token.pl',token)
        session['login_token'] = token

    def setPassword(self,get):
        if get.password1 != get.password2: return public.returnMsg(False,'USER_PASSWORD_CHECK')
        if len(get.password1) < 5: return public.returnMsg(False,'USER_PASSWORD_LEN')
        public.M('users').where("username=?",(session['username'],)).setField('password',public.md5(get.password1.strip()))
        public.WriteLog('TYPE_PANEL','USER_PASSWORD_SUCCESS',(session['username'],))
        self.reload_session()
        return public.returnMsg(True,'USER_PASSWORD_SUCCESS')

    def setUsername(self,get):
        if get.username1 != get.username2: return public.returnMsg(False,'USER_USERNAME_CHECK')
        if len(get.username1) < 3: return public.returnMsg(False,'USER_USERNAME_LEN')
        public.M('users').where("username=?",(session['username'],)).setField('username',get.username1.strip())
        public.WriteLog('TYPE_PANEL','USER_USERNAME_SUCCESS',(session['username'],get.username2))
        session['username'] = get.username1
        self.reload_session()
        return public.returnMsg(True,'USER_USERNAME_SUCCESS')

    def setPanel(self,get):
        if not public.IsRestart(): return public.returnMsg(False,'EXEC_ERR_TASK');
        isReWeb = False
        sess_out_path = 'data/session_timeout.pl'
        if 'session_timeout' in get:
            session_timeout = int(get.session_timeout)
            s_time_tmp = public.readFile(sess_out_path)
            if not s_time_tmp: s_time_tmp = '0'
            if int(s_time_tmp) != session_timeout:
                if session_timeout < 300: return public.returnMsg(False,'NOT_LESS_THAN_TIMEOUT')
                public.writeFile(sess_out_path,str(session_timeout))
                isReWeb = True

        workers_p = 'data/workers.pl'
        if 'workers' in get:
            workers = int(get.workers)
            if int(public.readFile(workers_p)) != workers:
                if workers < 1 or workers > 1024: return public.returnMsg(False,public.GetMsg("PANEL_THREAD_RANGE_ERR"))
                public.writeFile(workers_p,str(workers))
                isReWeb = True

        if get.domain:
            reg = "^([\w\-\*]{1,100}\.){1,4}(\w{1,10}|\w{1,10}\.\w{1,10})$";
            if not re.match(reg, get.domain): return public.returnMsg(False,'SITE_ADD_ERR_DOMAIN');

        oldPort = public.GetHost(True);
        newPort = get.port;
        if oldPort != get.port:
            get.port = str(int(get.port))
            if self.IsOpen(get.port):
                return public.returnMsg(False,'PORT_CHECK_EXISTS',(get.port,))
            if int(get.port) >= 65535 or  int(get.port) < 100: return public.returnMsg(False,'PORT_CHECK_RANGE');
            public.writeFile('data/port.pl',get.port)
            import firewalls
            get.ps = public.getMsg('PORT_CHECK_PS');
            fw = firewalls.firewalls();
            fw.AddAcceptPort(get);
            get.port = oldPort;
            get.id = public.M('firewall').where("port=?",(oldPort,)).getField('id');
            fw.DelAcceptPort(get);
            isReWeb = True

        if get.webname != session['title']:
            session['title'] = get.webname
            public.SetConfigValue('title',get.webname)

        limitip = public.readFile('data/limitip.conf');
        if get.limitip != limitip: public.writeFile('data/limitip.conf',get.limitip);

        public.writeFile('data/domain.conf',get.domain.strip())
        public.writeFile('data/iplist.txt',get.address)


        public.M('config').where("id=?",('1',)).save('backup_path,sites_path',(get.backup_path,get.sites_path))
        session['config']['backup_path'] = os.path.join('/',get.backup_path)
        session['config']['sites_path'] = os.path.join('/',get.sites_path)
        mhost = public.GetHost()
        if get.domain.strip(): mhost = get.domain
        data = {'uri':request.path,'host':mhost+':'+newPort,'status':True,'isReWeb':isReWeb,'msg':public.getMsg('PANEL_SAVE')}
        public.WriteLog('TYPE_PANEL','PANEL_SET_SUCCESS',(newPort,get.domain,get.backup_path,get.sites_path,get.address,get.limitip))
        if isReWeb: public.restart_panel()
        return data


    def set_admin_path(self,get):
        get.admin_path = get.admin_path.strip()
        if get.admin_path == '': get.admin_path = '/'
        if get.admin_path != '/':
            if len(get.admin_path) < 6: return public.returnMsg(False, 'SECURITY_ENTRANCE_ADDRESS_NOT_LESS_THAN')
            if get.admin_path in admin_path_checks: return public.returnMsg(False, 'SECURITY_ENTRANCE_ADDRESS_EXIST')
            if not re.match("^/[\w\./-_]+$", get.admin_path):  return public.returnMsg(False, 'SECURITY_ENTRANCE_ADDRESS_INCORRECT')
            if get.admin_path[0] != '/': return public.returnMsg(False, 'SECURITY_ENTRANCE_ADDRESS_INCORRECT')
        else:
            get.domain = public.readFile('data/domain.conf')
            if not get.domain: get.domain = '';
            get.limitip = public.readFile('data/limitip.conf')
            if not get.limitip: get.limitip = '';
            if not get.domain.strip() and not get.limitip.strip(): return public.returnMsg(False,
                                                                                           'SECURITY_ENTRANCE_ADDRESS_TRUEN_OFF_WARN')

        admin_path_file = 'data/admin_path.pl'
        admin_path = '/'
        if os.path.exists(admin_path_file): admin_path = public.readFile(admin_path_file).strip()
        if get.admin_path != admin_path:
            public.writeFile(admin_path_file,get.admin_path)
            public.restart_panel()
        return public.returnMsg(True, 'EDIT_SUCCESS');


    def setPathInfo(self,get):
        #设置PATH_INFO
        version = get.version
        type = get.type
        if public.get_webserver() == 'nginx':
            path = public.GetConfigValue('setup_path')+'/nginx/conf/enable-php-'+version+'.conf';
            conf = public.readFile(path);
            rep = "\s+#*include\s+pathinfo.conf;";
            if type == 'on':
                conf = re.sub(rep,'\n\t\t\tinclude pathinfo.conf;',conf)
            else:
                conf = re.sub(rep,'\n\t\t\t#include pathinfo.conf;',conf)
            public.writeFile(path,conf)
            public.serviceReload();

        path = public.GetConfigValue('setup_path')+'/php/'+version+'/etc/php.ini';
        conf = public.readFile(path);
        rep = "\n*\s*cgi\.fix_pathinfo\s*=\s*([0-9]+)\s*\n";
        status = '0'
        if type == 'on':status = '1'
        conf = re.sub(rep,"\ncgi.fix_pathinfo = "+status+"\n",conf)
        public.writeFile(path,conf)
        public.WriteLog("TYPE_PHP", "PHP_PATHINFO_SUCCESS",(version,type));
        public.phpReload(version);
        return public.returnMsg(True,'SET_SUCCESS');


    #设置文件上传大小限制
    def setPHPMaxSize(self,get):
        version = get.version
        max = get.max

        if int(max) < 2: return public.returnMsg(False,'PHP_UPLOAD_MAX_ERR')

        #设置PHP
        path = public.GetConfigValue('setup_path')+'/php/'+version+'/etc/php.ini'
        conf = public.readFile(path)
        rep = u"\nupload_max_filesize\s*=\s*[0-9]+M"
        conf = re.sub(rep,u'\nupload_max_filesize = '+max+'M',conf)
        rep = u"\npost_max_size\s*=\s*[0-9]+M"
        conf = re.sub(rep,u'\npost_max_size = '+max+'M',conf)
        public.writeFile(path,conf)

        if public.get_webserver() == 'nginx':
            #设置Nginx
            path = public.GetConfigValue('setup_path')+'/nginx/conf/nginx.conf'
            conf = public.readFile(path)
            rep = "client_max_body_size\s+([0-9]+)m"
            tmp = re.search(rep,conf).groups()
            if int(tmp[0]) < int(max):
                conf = re.sub(rep,'client_max_body_size '+max+'m',conf)
                public.writeFile(path,conf)

        public.serviceReload()
        public.phpReload(version);
        public.WriteLog("TYPE_PHP", "PHP_UPLOAD_MAX",(version,max))
        return public.returnMsg(True,'SET_SUCCESS')

    #设置禁用函数
    def setPHPDisable(self,get):
        filename = public.GetConfigValue('setup_path') + '/php/' + get.version + '/etc/php.ini'
        if not os.path.exists(filename): return public.returnMsg(False,'PHP_NOT_EXISTS');
        phpini = public.readFile(filename);
        rep = "disable_functions\s*=\s*.*\n"
        phpini = re.sub(rep, 'disable_functions = ' + get.disable_functions + "\n", phpini);
        public.WriteLog('TYPE_PHP','PHP_DISABLE_FUNCTION',(get.version,get.disable_functions))
        public.writeFile(filename,phpini);
        public.phpReload(get.version);
        return public.returnMsg(True,'SET_SUCCESS');

    #设置PHP超时时间
    def setPHPMaxTime(self,get):
        time = get.time
        version = get.version;
        if int(time) < 30 or int(time) > 86400: return public.returnMsg(False,'PHP_TIMEOUT_ERR');
        file = public.GetConfigValue('setup_path')+'/php/'+version+'/etc/php-fpm.conf';
        conf = public.readFile(file);
        rep = "request_terminate_timeout\s*=\s*([0-9]+)\n";
        conf = re.sub(rep,"request_terminate_timeout = "+time+"\n",conf);
        public.writeFile(file,conf)

        file = '/www/server/php/'+version+'/etc/php.ini';
        phpini = public.readFile(file);
        rep = "max_execution_time\s*=\s*([0-9]+)\r?\n";
        phpini = re.sub(rep,"max_execution_time = "+time+"\n",phpini);
        rep = "max_input_time\s*=\s*([0-9]+)\r?\n";
        phpini = re.sub(rep,"max_input_time = "+time+"\n",phpini);
        public.writeFile(file,phpini)

        if public.get_webserver() == 'nginx':
            #设置Nginx
            path = public.GetConfigValue('setup_path')+'/nginx/conf/nginx.conf';
            conf = public.readFile(path);
            rep = "fastcgi_connect_timeout\s+([0-9]+);";
            tmp = re.search(rep, conf).groups();
            if int(tmp[0]) < int(time):
                conf = re.sub(rep,'fastcgi_connect_timeout '+time+';',conf);
                rep = "fastcgi_send_timeout\s+([0-9]+);";
                conf = re.sub(rep,'fastcgi_send_timeout '+time+';',conf);
                rep = "fastcgi_read_timeout\s+([0-9]+);";
                conf = re.sub(rep,'fastcgi_read_timeout '+time+';',conf);
                public.writeFile(path,conf);

        public.WriteLog("TYPE_PHP", "PHP_TIMEOUT",(version,time));
        public.serviceReload()
        public.phpReload(version);
        return public.returnMsg(True, 'SET_SUCCESS');


    #取FPM设置
    def getFpmConfig(self,get):
        version = get.version;
        file = public.GetConfigValue('setup_path')+"/php/"+version+"/etc/php-fpm.conf";
        conf = public.readFile(file);
        data = {}
        rep = "\s*pm.max_children\s*=\s*([0-9]+)\s*";
        tmp = re.search(rep, conf).groups();
        data['max_children'] = tmp[0];

        rep = "\s*pm.start_servers\s*=\s*([0-9]+)\s*";
        tmp = re.search(rep, conf).groups();
        data['start_servers'] = tmp[0];

        rep = "\s*pm.min_spare_servers\s*=\s*([0-9]+)\s*";
        tmp = re.search(rep, conf).groups();
        data['min_spare_servers'] = tmp[0];

        rep = "\s*pm.max_spare_servers \s*=\s*([0-9]+)\s*";
        tmp = re.search(rep, conf).groups();
        data['max_spare_servers'] = tmp[0];

        rep = "\s*pm\s*=\s*(\w+)\s*";
        tmp = re.search(rep, conf).groups();
        data['pm'] = tmp[0];

        return data


    #设置
    def setFpmConfig(self,get):
        version = get.version
        max_children = get.max_children
        start_servers = get.start_servers
        min_spare_servers = get.min_spare_servers
        max_spare_servers = get.max_spare_servers
        pm = get.pm

        file = public.GetConfigValue('setup_path')+"/php/"+version+"/etc/php-fpm.conf";
        conf = public.readFile(file);

        rep = "\s*pm.max_children\s*=\s*([0-9]+)\s*";
        conf = re.sub(rep, "\npm.max_children = "+max_children, conf);

        rep = "\s*pm.start_servers\s*=\s*([0-9]+)\s*";
        conf = re.sub(rep, "\npm.start_servers = "+start_servers, conf);

        rep = "\s*pm.min_spare_servers\s*=\s*([0-9]+)\s*";
        conf = re.sub(rep, "\npm.min_spare_servers = "+min_spare_servers, conf);

        rep = "\s*pm.max_spare_servers \s*=\s*([0-9]+)\s*";
        conf = re.sub(rep, "\npm.max_spare_servers = "+max_spare_servers+"\n", conf);

        rep = "\s*pm\s*=\s*(\w+)\s*";
        conf = re.sub(rep, "\npm = "+pm+"\n", conf);

        public.writeFile(file,conf)
        public.phpReload(version);
        public.WriteLog("TYPE_PHP",'PHP_CHILDREN', (version,max_children,start_servers,min_spare_servers,max_spare_servers));
        return public.returnMsg(True, 'SET_SUCCESS');

    #同步时间
    def syncDate(self,get):
        time_str = public.HttpGet(public.GetConfigValue('home') + '/api/index/get_time')
        new_time = int(time_str)
        time_arr = time.localtime(new_time)
        date_str = time.strftime("%Y-%m-%d %H:%M:%S", time_arr)
        result = public.ExecShell('date -s "%s"' % date_str);
        public.WriteLog("TYPE_PANEL", "DATE_SUCCESS");
        return public.returnMsg(True,"DATE_SUCCESS");

    def IsOpen(self,port):
        #检查端口是否占用
        import socket
        s = socket.socket(socket.AF_INET,socket.SOCK_STREAM)
        try:
            s.connect(('127.0.0.1',int(port)))
            s.shutdown(2)
            return True
        except:
            return False

    #设置是否开启监控
    def SetControl(self,get):
        try:
            if hasattr(get,'day'):
                get.day = int(get.day);
                get.day = str(get.day);
                if(get.day < 1): return public.returnMsg(False,"CONTROL_ERR");
        except:
            pass

        filename = 'data/control.conf';
        if get.type == '1':
            public.writeFile(filename,get.day);
            public.WriteLog("TYPE_PANEL",'CONTROL_OPEN',(get.day,));
        elif get.type == '0':
            public.ExecShell("rm -f " + filename);
            public.WriteLog("TYPE_PANEL", "CONTROL_CLOSE");
        elif get.type == 'del':
            if not public.IsRestart(): return public.returnMsg(False,'EXEC_ERR_TASK');
            os.remove("data/system.db")
            import db;
            sql = db.Sql()
            result = sql.dbfile('system').create('system');
            public.WriteLog("TYPE_PANEL", "CONTROL_CLOSE");
            return public.returnMsg(True,"CONTROL_CLOSE");

        else:
            data = {}
            if os.path.exists(filename):
                try:
                    data['day'] = int(public.readFile(filename));
                except:
                    data['day'] = 30;
                data['status'] = True
            else:
                data['day'] = 30;
                data['status'] = False
            return data

        return public.returnMsg(True,"SET_SUCCESS");

    #关闭面板
    def ClosePanel(self,get):
        filename = 'data/close.pl'
        if os.path.exists(filename):
            os.remove(filename)
            return public.returnMsg(True, 'OPEN_SUCCESSFUL')
        public.writeFile(filename, 'True');
        public.ExecShell("chmod 600 " + filename);
        public.ExecShell("chown root.root " + filename);
        return public.returnMsg(True,'PANEL_CLOSE');


    #设置自动更新
    def AutoUpdatePanel(self,get):
        #return public.returnMsg(False,'体验服务器，禁止修改!')
        filename = 'data/autoUpdate.pl'
        if os.path.exists(filename):
            os.remove(filename);
        else:
            public.writeFile(filename,'True');
            public.ExecShell("chmod 600 " + filename);
            public.ExecShell("chown root.root " + filename);
        return public.returnMsg(True,'SET_SUCCESS');

    #设置二级密码
    def SetPanelLock(self,get):
        path = 'data/lock';
        if not os.path.exists(path):
            public.ExecShell('mkdir ' + path);
            public.ExecShell("chmod 600 " + path);
            public.ExecShell("chown root.root " + path);

        keys = ['files','tasks','config'];
        for name in keys:
            filename = path + '/' + name + '.pl';
            if hasattr(get,name):
                public.writeFile(filename,'True');
            else:
                if os.path.exists(filename): os.remove(filename);

    #设置PHP守护程序
    def Set502(self,get):
        filename = 'data/502Task.pl';
        if os.path.exists(filename):
            os.system('rm -f ' + filename)
        else:
            public.writeFile(filename,'True')

        return public.returnMsg(True,'SET_SUCCESS');

    #设置模板
    def SetTemplates(self,get):
        public.writeFile('data/templates.pl',get.templates);
        return public.returnMsg(True,'SET_SUCCESS');

    #设置面板SSL
    def SetPanelSSL(self,get):
        if hasattr(get,"email"):
            rep_mail = "^[a-zA-Z0-9_-]+@[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+)+$"
            if not re.search(rep_mail,get.email):
                return public.returnMsg(False,'The E-Mail format is illegal')
            import setPanelLets
            sp = setPanelLets.setPanelLets()
            sps = sp.set_lets(get)
            return sps
        else:
            sslConf = '/www/server/panel/data/ssl.pl';
            if os.path.exists(sslConf):
                os.system('rm -f ' + sslConf);
                return public.returnMsg(True,'PANEL_SSL_CLOSE');
            else:
                os.system('pip install cffi');
                os.system('pip install cryptography');
                os.system('pip install pyOpenSSL');
                try:
                    if not self.CreateSSL(): return public.returnMsg(False,'PANEL_SSL_ERR');
                    public.writeFile(sslConf,'True')
                except Exception as ex:
                    return public.returnMsg(False,'PANEL_SSL_ERR');
                return public.returnMsg(True,'PANEL_SSL_OPEN');
    #自签证书
    def CreateSSL(self):
        if os.path.exists('ssl/input.pl'): return True;
        import OpenSSL
        key = OpenSSL.crypto.PKey()
        key.generate_key(OpenSSL.crypto.TYPE_RSA, 2048)
        cert = OpenSSL.crypto.X509()
        cert.set_serial_number(0)
        cert.get_subject().CN = public.GetLocalIp()
        cert.set_issuer(cert.get_subject())
        cert.gmtime_adj_notBefore( 0 )
        cert.gmtime_adj_notAfter(86400 * 3650)
        cert.set_pubkey( key )
        cert.sign( key, 'md5' )
        cert_ca = OpenSSL.crypto.dump_certificate(OpenSSL.crypto.FILETYPE_PEM, cert)
        private_key = OpenSSL.crypto.dump_privatekey(OpenSSL.crypto.FILETYPE_PEM, key)
        if len(cert_ca) > 100 and len(private_key) > 100:
            public.writeFile('ssl/certificate.pem',cert_ca,'wb+')
            public.writeFile('ssl/privateKey.pem',private_key,'wb+')
            return True
        return False

    #生成Token
    def SetToken(self,get):
        data = {}
        data[''] = public.GetRandomString(24);

    #取面板列表
    def GetPanelList(self,get):
        try:
            data = public.M('panel').field('id,title,url,username,password,click,addtime').order('click desc').select();
            if type(data) == str: data[111];
            return data;
        except:
            sql = '''CREATE TABLE IF NOT EXISTS `panel` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `title` TEXT,
  `url` TEXT,
  `username` TEXT,
  `password` TEXT,
  `click` INTEGER,
  `addtime` INTEGER
);'''
            public.M('sites').execute(sql,());
            return [];

    #添加面板资料
    def AddPanelInfo(self,get):

        #校验是还是重复
        isAdd = public.M('panel').where('title=? OR url=?',(get.title,get.url)).count();
        if isAdd: return public.returnMsg(False,'PANEL_SSL_ADD_EXISTS');
        import time,json;
        isRe = public.M('panel').add('title,url,username,password,click,addtime',(get.title,get.url,get.username,get.password,0,int(time.time())));
        if isRe: return public.returnMsg(True,'ADD_SUCCESS');
        return public.returnMsg(False,'ADD_ERROR');

    #修改面板资料
    def SetPanelInfo(self,get):
        #校验是还是重复
        isSave = public.M('panel').where('(title=? OR url=?) AND id!=?',(get.title,get.url,get.id)).count();
        if isSave: return public.returnMsg(False,'PANEL_SSL_ADD_EXISTS');
        import time,json;

        #更新到数据库
        isRe = public.M('panel').where('id=?',(get.id,)).save('title,url,username,password',(get.title,get.url,get.username,get.password));
        if isRe: return public.returnMsg(True,'EDIT_SUCCESS');
        return public.returnMsg(False,'EDIT_ERROR');
        pass

    #删除面板资料
    def DelPanelInfo(self,get):
        isExists = public.M('panel').where('id=?',(get.id,)).count();
        if not isExists: return public.returnMsg(False,'PANEL_SSL_ADD_NOT_EXISTS');
        public.M('panel').where('id=?',(get.id,)).delete();
        return public.returnMsg(True,'DEL_SUCCESS');
        pass

    #点击计数
    def ClickPanelInfo(self,get):
        click = public.M('panel').where('id=?',(get.id,)).getField('click');
        public.M('panel').where('id=?',(get.id,)).setField('click',click+1);
        return True;

    #获取PHP配置参数
    def GetPHPConf(self,get):
        gets = [
                {'name':'short_open_tag','type':1,'ps':public.getMsg('PHP_CONF_1')},
                {'name':'asp_tags','type':1,'ps':public.getMsg('PHP_CONF_2')},
                {'name':'max_execution_time','type':2,'ps':public.getMsg('PHP_CONF_4')},
                {'name':'max_input_time','type':2,'ps':public.getMsg('PHP_CONF_5')},
                {'name':'memory_limit','type':2,'ps':public.getMsg('PHP_CONF_6')},
                {'name':'post_max_size','type':2,'ps':public.getMsg('PHP_CONF_7')},
                {'name':'file_uploads','type':1,'ps':public.getMsg('PHP_CONF_8')},
                {'name':'upload_max_filesize','type':2,'ps':public.getMsg('PHP_CONF_9')},
                {'name':'max_file_uploads','type':2,'ps':public.getMsg('PHP_CONF_10')},
                {'name':'default_socket_timeout','type':2,'ps':public.getMsg('PHP_CONF_11')},
                {'name':'error_reporting','type':3,'ps':public.getMsg('PHP_CONF_12')},
                {'name':'display_errors','type':1,'ps':public.getMsg('PHP_CONF_13')},
                {'name':'cgi.fix_pathinfo','type':0,'ps':public.getMsg('PHP_CONF_14')},
                {'name':'date.timezone','type':3,'ps':public.getMsg('PHP_CONF_15')}
                ]
        phpini = public.readFile('/www/server/php/' + get.version + '/etc/php.ini');

        result = []
        for g in gets:
            rep = g['name'] + '\s*=\s*([0-9A-Za-z_& ~]+)(\s*;?|\r?\n)';
            tmp = re.search(rep,phpini)
            if not tmp: continue;
            g['value'] = tmp.groups()[0];
            result.append(g);

        return result;


    def get_php_config(self,get):
        #取PHP配置
        get.version = get.version.replace('.','')
        file = session['setupPath'] + "/php/"+get.version+"/etc/php.ini"
        phpini = public.readFile(file)
        file = session['setupPath'] + "/php/"+get.version+"/etc/php-fpm.conf"
        phpfpm = public.readFile(file)
        data = {}
        try:
            rep = "upload_max_filesize\s*=\s*([0-9]+)M"
            tmp = re.search(rep,phpini).groups()
            data['max'] = tmp[0]
        except:
            data['max'] = '50'
        try:
            rep = "request_terminate_timeout\s*=\s*([0-9]+)\n"
            tmp = re.search(rep,phpfpm).groups()
            data['maxTime'] = tmp[0]
        except:
            data['maxTime'] = 0

        try:
            rep = r"\n;*\s*cgi\.fix_pathinfo\s*=\s*([0-9]+)\s*\n"
            tmp = re.search(rep,phpini).groups()

            if tmp[0] == '1':
                data['pathinfo'] = True
            else:
                data['pathinfo'] = False
        except:
            data['pathinfo'] = False

        return data

    #提交PHP配置参数
    def SetPHPConf(self,get):
        gets = ['display_errors','cgi.fix_pathinfo','date.timezone','short_open_tag','asp_tags','max_execution_time','max_input_time','memory_limit','post_max_size','file_uploads','upload_max_filesize','max_file_uploads','default_socket_timeout','error_reporting']
        filename = '/www/server/php/' + get.version + '/etc/php.ini';
        phpini = public.readFile(filename);
        for g in gets:
            try:
                rep = g + '\s*=\s*(.+)\r?\n';
                val = g+' = ' + get[g] + '\n';
                phpini = re.sub(rep,val,phpini);
            except: continue

        public.writeFile(filename,phpini);
        os.system('/etc/init.d/php-fpm-' + get.version + ' reload');
        return public.returnMsg(True,'SET_SUCCESS');


 # 取Session缓存方式
    def GetSessionConf(self,get):
        phpini = public.readFile('/www/server/php/' + get.version + '/etc/php.ini')
        rep = 'session.save_handler\s*=\s*([0-9A-Za-z_& ~]+)(\s*;?|\r?\n)'
        save_handler = re.search(rep, phpini)
        if save_handler:
            save_handler = save_handler.group(1)
        else:
            save_handler = "files"

        reppath = '\nsession.save_path\s*=\s*"tcp\:\/\/([\d\.]+):(\d+).*\r?\n'
        passrep = '\nsession.save_path\s*=\s*"tcp://[\w\.\?\:]+=(.*)"\r?\n'
        save_path = re.search(reppath, phpini)
        passwd = re.search(passrep, phpini)
        port = ""
        if passwd:
            passwd = passwd.group(1)
        else:
            passwd = ""
        if save_path:
            port = save_path.group(2)
            save_path = save_path.group(1)

        else:
            save_path = ""
        return {"save_handler": save_handler, "save_path": save_path, "passwd": passwd, "port": port}

    # 设置Session缓存方式
    def SetSessionConf(self, get):
        g = get.save_handler
        ip = get.ip
        port = get.port
        passwd = get.passwd
        if g != "files":
            iprep = "(2(5[0-5]{1}|[0-4]\d{1})|[0-1]?\d{1,2})\.(2(5[0-5]{1}|[0-4]\d{1})|[0-1]?\d{1,2})\.(2(5[0-5]{1}|[0-4]\d{1})|[0-1]?\d{1,2})\.(2(5[0-5]{1}|[0-4]\d{1})|[0-1]?\d{1,2})"
            if not re.search(iprep, ip):
                return public.returnMsg(False, 'FIREWALL_IP_FORMAT')
            try:
                port = int(port)
                if port >= 65535 or port < 1:
                    return public.returnMsg(False, 'SITE_ADD_ERR_PORT')
            except:
                return public.returnMsg(False, 'SITE_ADD_ERR_PORT')
            prep = "[\~\`\/\=]"
            if re.search(prep, passwd):
                return public.returnMsg(False, 'SPECIAL_CHARACTRES', ('" ~ ` / = "'))
        filename = '/www/server/php/' + get.version + '/etc/php.ini'
        phpini = public.readFile(filename)
        rep = 'session.save_handler\s*=\s*(.+)\r?\n'
        val = 'session.save_handler = ' + g + '\n'
        phpini = re.sub(rep, val, phpini)
        if g == "memcache":
            if not re.search("memcache.so", phpini):
                return public.returnMsg(False, 'INSTALL_EXTEND_FIRST', (g))
            rep = '\nsession.save_path\s*=\s*(.+)\r?\n'
            val = '\nsession.save_path = "tcp://%s:%s"\n' % (ip, port)
            if re.search(rep, phpini):
                phpini = re.sub(rep, val, phpini)
            else:
                phpini = re.sub('\n;session.save_path = "/tmp"', '\n;session.save_path = "/tmp"' + val, phpini)
        if g == "redis":
            if not re.search("redis.so", phpini):
                return public.returnMsg(False, 'INSTALL_EXTEND_FIRST', (g))
            if passwd:
                passwd = "?auth=" + passwd
            else:
                passwd = ""
            rep = '\nsession.save_path\s*=\s*(.+)\r?\n'
            val = '\nsession.save_path = "tcp://%s:%s%s"\n' % (ip, port, passwd)
            res = re.search(rep, phpini)
            if res:
                phpini = re.sub(rep, val, phpini)
            else:
                phpini = re.sub('\n;session.save_path = "/tmp"', '\n;session.save_path = "/tmp"' + val, phpini)
        if g == "files":
            rep = '\nsession.save_path\s*=\s*(.+)\r?\n'
            val = '\nsession.save_path = "/tmp"\n'
            if re.search(rep, phpini):
                phpini = re.sub(rep, val, phpini)
            else:
                phpini = re.sub('\n;session.save_path = "/tmp"', '\n;session.save_path = "/tmp"' + val, phpini)
        public.writeFile(filename, phpini)
        os.system('/etc/init.d/php-fpm-' + get.version + ' reload')
        return public.returnMsg(True, 'SET_SUCCESS')

    # 获取Session文件数量
    def GetSessionCount(self, get):
        d="/tmp"
        count = 0
        list = os.listdir(d)
        for l in list:
            if "sess_" in l:
                count += 1

        s = "find /tmp -mtime +1 |grep 'sess_'|wc -l"
        old_file_conf = int(public.ExecShell(s)[0].split("\n")[0])

        return {"total":count,"oldfile":old_file_conf}

    # 删除老文件
    def DelOldSession(self,get):
        s = "find /tmp -mtime +1 |grep 'sess_'|xargs rm -f"
        os.system(s)
        s = "find /tmp -mtime +1 |grep 'sess_'|wc -l"
        old_file_conf = int(public.ExecShell(s)[0].split("\n")[0])
        if old_file_conf == 0:
            return public.returnMsg(True, 'DEL_SUCCESS')
        else:
            return public.returnMsg(True, 'DEL_ERROR')

    # 获取面板证书
    def GetPanelSSL(self, get):
        cert = {}
        cert['privateKey'] = public.readFile('ssl/privateKey.pem');
        cert['certPem'] = public.readFile('ssl/certificate.pem');
        cert['rep'] = os.path.exists('ssl/input.pl');
        return cert;

    #保存面板证书
    def SavePanelSSL(self,get):
        keyPath = 'ssl/privateKey.pem'
        certPath = 'ssl/certificate.pem'
        checkCert = '/tmp/cert.pl'
        public.writeFile(checkCert,get.certPem)
        if get.privateKey:
            public.writeFile(keyPath,get.privateKey);
        if get.certPem:
            public.writeFile(certPath, get.certPem);
        if not public.CheckCert(checkCert): return public.returnMsg(False, 'SITE_SSL_ERR_CERT');
        public.writeFile('ssl/input.pl', 'True');
        return public.returnMsg(True, 'SITE_SSL_SUCCESS');

    #获取配置
    def get_config(self,get):
        if 'config' in session: return session['config']
        data = public.M('config').where("id=?",('1',)).field('webserver,sites_path,backup_path,status,mysql_root').find();
        return data


    #取面板错误日志
    def get_error_logs(self,get):
        return public.GetNumLines('logs/error.log',2000)

    def is_pro(self,get):
        import panelAuth,json
        pdata = panelAuth.panelAuth().create_serverid(None)
        url = public.GetConfigValue('home') + '/api/panel/is_pro'
        pluginTmp = public.httpPost(url,pdata)
        pluginInfo = json.loads(pluginTmp)
        return pluginInfo

    def get_token(self,get):
        save_path = '/www/server/panel/config/api.json'
        if not os.path.exists(save_path):
            data = { "open":False, "token":"", "limit_addr":[] }
            public.WriteFile(save_path,json.dumps(data))
            public.ExecShell("chmod 600 " + save_path)
        data = json.loads(public.ReadFile(save_path))
        data['token'] = "***********************************"
        data['limit_addr'] = '\n'.join(data['limit_addr'])
        return data

    def set_token(self, get):
        if 'request_token' in get: return public.returnMsg(False, 'CANT_SET_API_WIFTH_API')
        save_path = '/www/server/panel/config/api.json'
        data = json.loads(public.ReadFile(save_path))
        if get.t_type == '1':
            token = public.GetRandomString(32)
            data['token'] = public.md5(token)
            public.WriteLog('SET_API', 'REGENERATE_API_TOKEN')
        elif get.t_type == '2':
            data['open'] = not data['open']
            stats = {True: public.GetMsg("TURN_ON"), False: public.GetMsg("CLOSE")}
            public.WriteLog('SET_API', 'API_INTERFACE', (stats[data['open']],))
            token = stats[data['open']] + public.GetMsg("SUCCESS")
        elif get.t_type == '3':
            data['limit_addr'] = get.limit_addr.split('\n')
            public.WriteLog('SET_API', 'CHANGE_IP_LIMIT' , (get.limit_addr))
            token = public.GetMsg("SAVE_SUCCESS")

        public.WriteFile(save_path, json.dumps(data))
        return public.returnMsg(True, token)


    def get_tmp_token(self,get):
        save_path = '/www/server/panel/config/api.json'
        if not 'request_token' in get: return public.returnMsg(False,'Temporary key can only be obtained through the API interface')
        data = json.loads(public.ReadFile(save_path))
        data['tmp_token'] = public.GetRandomString(64)
        data['tmp_time'] = time.time()
        public.WriteFile(save_path,json.dumps(data))
        return public.returnMsg(True,data['tmp_token'])


    def GetNginxValue(self,get):
        n = nginx.nginx()
        return n.GetNginxValue()

    def SetNginxValue(self,get):
        n = nginx.nginx()
        return n.SetNginxValue(get)

    def GetApacheValue(self,get):
        a = apache.apache()
        return a.GetApacheValue()

    def SetApacheValue(self,get):
        a = apache.apache()
        return a.SetApacheValue(get)

    def get_ipv6_listen(self,get):
        return os.path.exists('data/ipv6.pl')

    def set_ipv6_status(self,get):
        ipv6_file = 'data/ipv6.pl'
        if self.get_ipv6_listen(get):
            os.remove(ipv6_file)
            public.WriteLog('TYPE_CONFIG', 'P_STOP_IPV6!')
        else:
            public.writeFile(ipv6_file, 'True')
            public.WriteLog('TYPE_CONFIG', 'P_START_IPV6!')
        public.restart_panel()
        return public.returnMsg(True, 'SET_SUCCESS')

    #自动补充CLI模式下的PHP版本
    def auto_cli_php_version(self,get):
        import panelSite
        php_versions = panelSite.panelSite().GetPHPVersion(get)
        php_bin_src = "/www/server/php/%s/bin/php" % php_versions[-1]['version']
        if not os.path.exists(php_bin_src): return public.returnMsg(False,'PHP_NOT_INSTALL')
        get.php_version = php_versions[-1]['version']
        self.set_cli_php_version(get)
        return php_versions[-1]

    #获取CLI模式下的PHP版本
    def get_cli_php_version(self,get):
        php_bin = '/usr/bin/php'
        if not os.path.exists(php_bin) or not os.path.islink(php_bin):  return self.auto_cli_php_version(get)
        link_re = os.readlink(php_bin)
        if not os.path.exists(link_re): return self.auto_cli_php_version(get)
        import panelSite
        php_versions = panelSite.panelSite().GetPHPVersion(get)
        del(php_versions[0])
        for v in php_versions:
            if link_re.find(v['version']) != -1: return {"select":v,"versions":php_versions}
        return {"select":self.auto_cli_php_version(get),"versions":php_versions}

    #设置CLI模式下的PHP版本
    def set_cli_php_version(self,get):
        php_bin = '/usr/bin/php'
        php_bin_src = "/www/server/php/%s/bin/php" % get.php_version
        php_ize = '/usr/bin/phpize'
        php_ize_src = "/www/server/php/%s/bin/phpize" % get.php_version
        php_fpm = '/usr/bin/php-fpm'
        php_fpm_src = "/www/server/php/%s/sbin/php-fpm" % get.php_version
        php_pecl = '/usr/bin/pecl'
        php_pecl_src = "/www/server/php/%s/bin/pecl" % get.php_version
        php_pear = '/usr/bin/pear'
        php_pear_src = "/www/server/php/%s/bin/pear" % get.php_version
        if not os.path.exists(php_bin_src): return public.returnMsg(False,'SPECIFIED_PHP_NOT_INSTALL')
        is_chattr = public.ExecShell('lsattr /usr|grep /usr/bin')[0].find('-i-')
        if is_chattr != -1: public.ExecShell('chattr -i /usr/bin')
        public.ExecShell("rm -f " + php_bin + ' '+ php_ize + ' ' + php_fpm + ' ' + php_pecl + ' ' + php_pear)
        public.ExecShell("ln -sf %s %s" % (php_bin_src,php_bin))
        public.ExecShell("ln -sf %s %s" % (php_ize_src,php_ize))
        public.ExecShell("ln -sf %s %s" % (php_fpm_src,php_fpm))
        public.ExecShell("ln -sf %s %s" % (php_pecl_src,php_pecl))
        public.ExecShell("ln -sf %s %s" % (php_pear_src,php_pear))
        if is_chattr != -1:  public.ExecShell('chattr +i /usr/bin')
        public.WriteLog('P_CONF','SET_PHP_CLI %s' % get.php_version)
        return public.returnMsg(True,'SET_SUCCESS')


    #获取BasicAuth状态
    def get_basic_auth_stat(self,get):
        path = 'config/basic_auth.json'
        is_install = True
        if not os.path.exists(path): return {"basic_user":"","basic_pwd":"","open":False,"is_install":is_install}
        ba_conf = json.loads(public.readFile(path))
        ba_conf['is_install'] = is_install
        return ba_conf

    #设置BasicAuth
    def set_basic_auth(self,get):
        is_open = False
        if get.open == 'True': is_open = True
        tips = '_bt.cn'
        path = 'config/basic_auth.json'
        ba_conf = None
        if os.path.exists(path):
            ba_conf = json.loads(public.readFile(path))

        if not ba_conf:
            ba_conf = {"basic_user":public.md5(get.basic_user.strip() + tips),"basic_pwd":public.md5(get.basic_pwd.strip() + tips),"open":is_open}
        else:
            if get.basic_user: ba_conf['basic_user'] = public.md5(get.basic_user.strip() + tips)
            if get.basic_pwd: ba_conf['basic_pwd'] = public.md5(get.basic_pwd.strip() + tips)
            ba_conf['open'] = is_open

        public.writeFile(path,json.dumps(ba_conf))
        os.chmod(path,384)
        public.WriteLog('P_CONF','SET_BASICAUTH_STATUS %s' % is_open)
        public.writeFile('data/reload.pl','True')
        return public.returnMsg(True,"SET_SUCCESS")

    #取面板运行日志
    def get_panel_error_logs(self,get):
        filename = 'logs/error.log'
        if not os.path.exists(filename): return public.returnMsg(False,'LOG_CLOSE')
        result = public.GetNumLines(filename,2000)
        return public.returnMsg(True,result)
    #清空面板运行日志
    def clean_panel_error_logs(self,get):
        filename = 'logs/error.log'
        public.writeFile(filename,'')
        public.WriteLog('P_CONF','CLEARING_LOG')
        return public.returnMsg(True,'CLEARED')

    # 获取lets证书
    def get_cert_source(self,get):
        import setPanelLets
        sp = setPanelLets.setPanelLets()
        spg = sp.get_cert_source()
        return spg

    #设置debug模式
    def set_debug(self,get):
        debug_path = 'data/debug.pl'
        if os.path.exists(debug_path):
            t_str = 'Close'
            os.remove(debug_path)
        else:
            t_str = 'Open'
            public.writeFile(debug_path,'True')
        public.WriteLog('TYPE_PANEL','%sDeveloper mode(debug)' % t_str)
        public.restart_panel()
        return public.returnMsg(True,'Successful setup!')