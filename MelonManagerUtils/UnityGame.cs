using Newtonsoft.Json;

namespace MelonManagerUtils
{
    internal class UnityGame
    {
        public string name;
        public string path;
        public string arch;

        [JsonProperty(NullValueHandling = NullValueHandling.Ignore)]
        public string error;
    }
}