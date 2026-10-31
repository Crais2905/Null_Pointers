param([ValidateSet('run','test')][string]$Task='run')
$ErrorActionPreference='Stop'
$root=$PSScriptRoot
if(!$env:JAVA_HOME -or !(Test-Path "$env:JAVA_HOME/bin/javac.exe")) {
 $candidates=@(
  'C:/Program Files/JetBrains/IntelliJ IDEA 2025.2.3/jbr',
  'C:/Program Files/JetBrains/WebStorm 2026.2.4/jbr',
  'C:/Program Files/JetBrains/PyCharm 2026.2.3/jbr',
  'C:/Program Files/Android/Android Studio/jbr',
  'C:/Program Files/Java/jdk-17',
  'C:/Program Files/Eclipse Adoptium'
 )
 $jdk=$candidates | Where-Object {Test-Path "$_/bin/javac.exe"} | Select-Object -First 1
 if(!$jdk){throw 'Select/install JDK 17+ and set JAVA_HOME to its directory.'}
 $env:JAVA_HOME=$jdk
}
$mvnCmd = "C:/Program Files/JetBrains/IntelliJ IDEA 2025.2.3/plugins/maven/lib/maven3/bin/mvn.cmd"
if (!(Test-Path $mvnCmd)) {
 $mvnCmd = "$root/mvnw.cmd"
}
Push-Location $root
try {
 $arguments=@('-f',"$root/fixer/backend/pom.xml")
 if($Task -eq 'test'){$arguments+='test'}else{$arguments+='spring-boot:run'}
 & $mvnCmd @arguments
 if($LASTEXITCODE -ne 0){throw "Maven failed ($LASTEXITCODE)"}
}finally{Pop-Location}
