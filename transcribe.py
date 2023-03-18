import whisper
import os
import sys,json
from pathlib import Path
model = whisper.load_model("base")

data = sys.stdin.readlines()
data = json.loads(data[0])
print("Data: ",data)

result = model.transcribe("testAudio.wav")

path = os.path.abspath("./testAudio.wav")
tempTest1 = os.getenv('APPDATA') + "\\electronconcepttest\\audio\\" + data
tempTest2 = "C:\\Users\\Danie\\AppData\\Roaming\\electronconcepttest\\audio\\1679177535144.wav"
print (tempTest1)
print (tempTest2)
print(tempTest1 == tempTest2)



audio = whisper.load_audio(tempTest1)
""" 
audio = whisper.load_audio(str(data[0]))
 """
audio = whisper.pad_or_trim(audio)


# make log-Mel spectrogram and move to the same device as the model
mel = whisper.log_mel_spectrogram(audio).to(model.device)

# detect the spoken language
_, probs = model.detect_language(mel)


# decode the audio
options = whisper.DecodingOptions(fp16 = False)
result = whisper.decode(model, mel, options)

# print the recognized text
print(result.text)