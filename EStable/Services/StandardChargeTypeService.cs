using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using EStable.Models;
using EStable.ViewModels.UserOfStableViewModels.Wizard.Factories;
using EStable.ViewModels.UserOfStableViewModels.Wizard.StepThree;

namespace EStable.Services
{
    public interface IStandardChargeTypeService
    {
        List<StandardChargeTypeViewModel> SaveStandardCharge(string description, string rate, string email);
    }

    class StandardChargeTypeService : IStandardChargeTypeService
    {
        private readonly WizardService _wizardService =
            new WizardService();
        private readonly IChargeTypeViewModelFactory _factory =
            new ChargeTypeViewModelFactory();


        public List<StandardChargeTypeViewModel> SaveStandardCharge(string description, string rate, string email)
        {
            var wizard = _wizardService.GetWizard(email);
            var standardCharge = new StandardCharge(description, rate);
            wizard.AddStandardCharge(standardCharge);

            var fileName = _wizardService.GetStableRegFileInfo(email);
            wizard.SaveXml(fileName.SystemFileName);

            return _factory.ToViewModel(wizard.ChargeTypes.StandardChargeTypes);
        }
    }
}