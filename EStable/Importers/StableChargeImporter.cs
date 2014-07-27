using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Web;
using EStable.Models;
using LumenWorks.Framework.IO.Csv;

namespace EStable.Importers
{
    public interface IStableChargeImporter
    {
        List<StableChargeType> ImportStableCharges(HttpPostedFileBase file);
    }

    public class StableChargeImporter : IStableChargeImporter
    {
        public List<StableChargeType> ImportStableCharges(HttpPostedFileBase file)
        {
            var result = new List<StableChargeType>();
            var stream = new StreamReader(file.InputStream);
            using (var reader = new CsvReader(stream, true))
            {
                reader.MissingFieldAction = MissingFieldAction.ReplaceByEmpty;
// ReSharper disable TooWideLocalVariableScope
                string unit;
                bool instable;
                string description;
                string rate;
                int id;
// ReSharper restore TooWideLocalVariableScope
                while (reader.ReadNextRecord())
                {
                    unit = reader[0];
                    instable = reader[1] == "true";
                    description = reader[2];
                    rate = reader[3];
                    id = result.Max(c => c.StableChargeTypeId) + 1;
                    result.Add(new StableChargeType(id, description, rate, unit, instable));
                }
            }
            return result;
        }
    }
}