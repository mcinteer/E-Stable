using System.Web;
using EStable.Constants;

namespace EStable.Models.Wizard
{
    public class FinancialInformationWizard : StableWizardBase
    {
        public FinancialInformationWizard(HttpCookie cookie)
        {
            GSTNumber = cookie[Codes.Cookies.Wizard.StepTwo.GSTNumber];
            GSTRate = cookie[Codes.Cookies.Wizard.StepTwo.GSTRate];
            NextInvoiceNumber = cookie[Codes.Cookies.Wizard.StepTwo.NextInvoiceNumber];
            GSTEffectiveDate = cookie[Codes.Cookies.Wizard.StepTwo.GSTEffectiveDate];
            PreviousGSTRate = cookie[Codes.Cookies.Wizard.StepTwo.PreviousGSTRate];
        }

        public FinancialInformationWizard()
        {
            
        }

        public string GSTNumber { get; set; }

        public string GSTRate { get; set; }

        public string NextInvoiceNumber { get; set; }

        public string GSTEffectiveDate { get; set; }

        public string PreviousGSTRate { get; set; }

        public void Merge(FinancialInformationWizard financialInformation)
        {
            GSTNumber = GSTNumber ?? financialInformation.GSTNumber;
            GSTRate = GSTRate ?? financialInformation.GSTRate;
            NextInvoiceNumber = NextInvoiceNumber ?? financialInformation.NextInvoiceNumber;
            GSTEffectiveDate = GSTEffectiveDate ?? financialInformation.GSTEffectiveDate;
            PreviousGSTRate = PreviousGSTRate ?? financialInformation.PreviousGSTRate;
        }
    }
}