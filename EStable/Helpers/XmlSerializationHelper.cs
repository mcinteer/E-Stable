using System;
using System.IO;
using System.Xml.Serialization;
using EStable.Constants;
using Microsoft.WindowsAzure;
using Microsoft.WindowsAzure.Storage;
using Microsoft.WindowsAzure.Storage.Blob;

namespace EStable.Helpers
{
    public class XmlSerializationHelper
    {
        public static void SerializeAndSave<T>(string fileName, T obj)
        {
            var blob = GetBlockBlob(fileName);
            var xs = new XmlSerializer(typeof (T));

            using (var stream = new MemoryStream())
            {
                xs.Serialize(stream, obj);
                stream.Position = 0;
                blob.UploadFromStream(stream);
            }
        }

        private static CloudBlockBlob GetBlockBlob(string filename)
        {
            var container = GetContainer();
            return container.GetBlockBlobReference(filename);
        }

        private static CloudBlobContainer GetContainer()
        {
            var account =
                CloudStorageAccount.Parse(CloudConfigurationManager.GetSetting(Codes.Azure.Storage.ConnectionStringName));
            var blobClient = account.CreateCloudBlobClient();
            var container = blobClient.GetContainerReference(Codes.Azure.Storage.ContainerNames.StableWizard);
            container.CreateIfNotExists();
            return container;
        }

        public static string Serialize<T>(T obj)
        {
            var xs = new XmlSerializer(typeof (T));

            using (var wr = new StringWriter())
            {
                xs.Serialize(wr, obj);
                return wr.ToString();
            }
        }

        public static T Deserialize<T>(string fileName)
        {
            var blob = GetBlockBlob(fileName);
            var xs = new XmlSerializer(typeof (T));

            using (var stream = new MemoryStream())
            {
                try
                {
                    blob.DownloadToStream(stream);
                    stream.Position = 0;
                    return (T) xs.Deserialize(stream);
                }
                catch (Exception ex)
                {
                    throw new FileNotFoundException();
                }
            }
        }
    }
}