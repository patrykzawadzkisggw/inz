java -jar antlr-4.13.2-complete.jar -Dlanguage=Java EconLang.g4
javac -cp ".;antlr-4.13.2-complete.jar" *.java
cmd.exe /c "java -cp .;antlr-4.13.2-complete.jar org.antlr.v4.gui.TestRig EconLang program -gui < input.txt"