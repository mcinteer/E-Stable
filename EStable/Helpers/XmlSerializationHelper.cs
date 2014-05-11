using System.IO;
using System.Xml.Serialization;

namespace EStable.Helpers
{
    public class XmlSerializationHelper
    {
        public static void SerializeAndSave<T>(string filename, T obj)
        {
            var path = filename.Substring(0, filename.LastIndexOf('\\'));
            var isExists = Directory.Exists(path);

            if (!isExists)
            {
                Directory.CreateDirectory(path);
            }

            var xs = new XmlSerializer(typeof(T));
            using (var wr = new StreamWriter(filename))
            {
                xs.Serialize(wr, obj);
            }
        }

        public static string Serialize<T>(T obj)
        {
            var xs = new XmlSerializer(typeof(T));

            using (var wr = new StringWriter())
            {
                xs.Serialize(wr, obj);
                return wr.ToString();
            }
        }

        public static T Deserialize<T>(string filename)
        {
            var xs = new XmlSerializer(typeof(T));
            using (var rd = new StreamReader(filename))
            {
                return (T)xs.Deserialize(rd);
            }
        }
    }
}