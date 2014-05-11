using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using EStable.Models.Wizard;
using EStable.Security;
using EStable.Services;
using EStable.ViewModels.UserOfStableViewModels.Wizard;
using EStable.ViewModels.UserOfStableViewModels.Wizard.Factories;
using EStable.ViewModels.UserOfStableViewModels.Wizard.StepOne;
using EStable.ViewModels.UserOfStableViewModels.Wizard.StepTwo;

namespace EStable.Bouncers
{
    public interface IWizardBouncer
    {
        SummaryWizard SaveContactDetails(ContactDetailsViewModel contactDetails, string email);
        void SaveFinancialData(FinancialInformationViewModel financialData, string email);
    }

    public class WizardBouncer : IWizardBouncer
    {
        private readonly WizardService _wizardService = new WizardService();
        private readonly IWizardSecurity _security = new WizardSecurity(); 
        private readonly IWizardService _service = new WizardService();

        public WizardBouncer()
        {

        }

        public SummaryWizard SaveContactDetails(ContactDetailsViewModel contactDetails, string email)
        {
            var fileName = _wizardService.GetStableRegFileInfo(email);
            _security.VerifyUserCanSaveWizardInformation(fileName.SystemFileName, contactDetails.StableName);

            return _service.SaveContactDetails(contactDetails, fileName.SystemFileName, email);
        }

        public void SaveFinancialData(FinancialInformationViewModel financialData, string email)
        {
            {
                var fileName = _wizardService.GetStableRegFileInfo(email);
                _security.VerifyUserCanSaveWizardInformation(fileName.SystemFileName, financialData.StableName);

                _service.SaveFinancialDetails(financialData, fileName.SystemFileName, email);
            }
        }
    }
}