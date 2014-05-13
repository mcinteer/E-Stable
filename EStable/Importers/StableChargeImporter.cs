using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Web;
using System.Web.UI.WebControls;
using EStable.Models;
using EStable.ViewModels.UserOfStableViewModels.Wizard.StepThree;
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
// ReSharper restore TooWideLocalVariableScope
                while (reader.ReadNextRecord())
                {
                    unit = reader[0];
                    instable = reader[1] == "true";
                    description = reader[2];
                    rate = reader[3];

                    result.Add(new StableChargeType(description, rate, unit, instable));
                }
            }
            return result;
        }
    }
}