using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Web;
using EStable.Models;
using LumenWorks.Framework.IO.Csv;

namespace EStable.Importers
{
    public interface IStandardChargeImporter
    {
        List<StandardCharge> ImportStableCharges(HttpPostedFileBase file);
    }
    public class StandardChargeImporter : IStandardChargeImporter
    {
        public List<StandardCharge> ImportStableCharges(HttpPostedFileBase file)
        {
            var result = new List<StandardCharge>();
            var stream = new StreamReader(file.InputStream);
            using (var reader = new CsvReader(stream, true))
            {
                reader.MissingFieldAction = MissingFieldAction.ReplaceByEmpty;
                // ReSharper disable TooWideLocalVariableScope
                string description;
                string rate;
                // ReSharper restore TooWideLocalVariableScope
                while (reader.ReadNextRecord())
                {
                    description = reader[0];
                    rate = reader[1];

                    result.Add(new StandardCharge(description, rate));
                }
            }
            return result;
        }
    }
}