netsh advfirewall firewall add rule name="CoursePlatform Frontend 5177" dir=in action=allow protocol=TCP localport=5177 profile=public remoteip=localsubnet
netsh advfirewall firewall add rule name="CoursePlatform Backend 3002" dir=in action=allow protocol=TCP localport=3002 profile=public remoteip=localsubnet
