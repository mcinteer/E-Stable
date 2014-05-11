using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace EStable.Models
{
    public class Stable
    {
        public int Id { get; set; }
        public int StableTypeId { get; set; }
        public string CountryCode { get; set; }
        public string StableName { get; set; }
        public string Trainer { get; set; }
        public string LegalName { get; set; }
        public string Address { get; set; }
        public string Mobile { get; set; }
        public string Phone { get; set; }
        public string Fax { get; set; }
        public string TaxNumber { get; set; } //GST,VAT,ETC
        public string GSTRateCurrent { get; set; }
        public string GSTEffectiveDate { get; set; }
        public string GSTRatePrevious { get; set; }
        public int NextInvoice { get; set; } // TODO: Ask the old fella, Is this the next invoice ID?
    }
}