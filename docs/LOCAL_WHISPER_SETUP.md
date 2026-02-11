# Local Whisper Setup

Whisper can be run on a local machine, bypassing OpenAI if you have the resources. It runs outside of Ollama so there is some additional setup needed.

### Setup

Be sure to install `ffmpeg` on the machine running `whisper.cpp` for audio conversion.

1. Clone [whisper.cpp](https://github.com/ggml-org/whisper.cpp) and follow the setup instructions in [quick start](https://github.com/ggml-org/whisper.cpp/tree/master?tab=readme-ov-file#quick-start).
    - There are several model options available so pick the one that fits your needs and setup
2. Run the server. I created a small script that includes some options to get started quickly, you can save this as a shell script in the `whisper.cpp` root directory. Replace the model if you changed it.

```bash
#!/bin/bash

./build/bin/whisper-server --model models/ggml-tiny.en.bin --port 3005 --convert
```
**Note:** the `--convert` option is required because Mind Melder records in `.webm` and `whisper.cpp` reuires `.wav`.

In Mind Melder under "Advanced Settings" you can enable local whisper and set the url where the whisper server is running. Note the `--port` if you need to change it.
