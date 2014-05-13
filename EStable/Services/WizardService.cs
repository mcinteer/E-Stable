using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Web;
using EStable.Constants;
using EStable.Domain;
using EStable.Helpers;
using EStable.Models;
using EStable.Models.Wizard;
using EStable.Repositories;
using EStable.ViewModels.UserOfStableViewModels.Wizard.Factories;
using EStable.ViewModels.UserOfStableViewModels.Wizard.StepOne;
using EStable.ViewModels.UserOfStableViewModels.Wizard.StepTwo;

namespace EStable.Services
{
    public interface IWizardService
    {
        void SaveStableRegFileName(string newFileName, string email);
        GetStableRegFileInfoResponse GetStableRegFileInfo(string email);
        SummaryWizard GetWizard(string email);
        SummaryWizard SaveContactDetails(ContactDetailsViewModel contactDetails, string fileName, string email);
        void SaveFinancialDetails(FinancialInformationViewModel contactDetails, string fileName, string email);
    }

    public class WizardService : IWizardService
    {
        private readonly WizardRepository _repository = new WizardRepository();
        private readonly ContactDetailsViewModelFactory _contactDetailsViewModelFactory =
            new ContactDetailsViewModelFactory();

        private readonly IFinancialInformationViewModelFactory _financialDataViewModelFactory = new FinancialInformationViewModelFactory();

        public WizardService()
        {
            
        }
        public void SaveStableRegFileName(string newFileName, string email)
        {
            _repository.SaveFileRegFileName(newFileName,email);
        }

        public GetStableRegFileInfoResponse GetStableRegFileInfo(string email)
        {
            return _repository.GetStableRegFileInfo(email);
        }


        public SummaryWizard GetWizard(string email)
        {
            var fileName = _repository.GetStableRegFileInfo(email);
            return GetWizardByFileName(fileName.SystemFileName, email);
        }

        public SummaryWizard GetWizardByFileName(string fileName, string email)
        {
            var path = Codes.FilePaths.WizardXml + fileName + ".xml";
            SummaryWizard wizard;
            try
            {
                wizard = XmlSerializationHelper.Deserialize<SummaryWizard>(path);
            }
            catch (FileNotFoundException ex)
            {
                wizard = new SummaryWizard();
                var newFileName = Guid.NewGuid().ToString();
                SaveStableRegFileName(newFileName, email);
                wizard.Email = email;
                wizard.SaveXml(newFileName);
            }

            // Ugly, but must be done as the deserialization method seems to enumerate lists twice.
            wizard.ContactInformation.PossibleStableType =
                wizard.ContactInformation.PossibleStableType.Distinct().ToList();

            return wizard;
        }


        public SummaryWizard SaveContactDetails(ContactDetailsViewModel contactDetails, string fileName, string email)
        {
            var contact = _contactDetailsViewModelFactory.ToDomainObject(contactDetails);
            var wizard = GetWizardByFileName(fileName, email);
            
            contact.Merge(wizard.ContactInformation);
            wizard.ContactInformation = contact;
            if (wizard.ChargeTypes == null)
            {
                wizard.ChargeTypes = new ChargeTypesWizard(contact.StableType);
            }
            wizard.SaveXml(fileName);
            return wizard;
        }

        public void SaveFinancialDetails(FinancialInformationViewModel financialData, string fileName, string email)
        {
            var financial = _financialDataViewModelFactory.ToDomainObject(financialData);
            var wizard = GetWizardByFileName(fileName, email);

            financial.Merge(wizard.FinancialInformation);
            wizard.FinancialInformation = financial;
            if (wizard.ChargeTypes == null)
            {
                wizard.ChargeTypes = new ChargeTypesWizard(wizard.ContactInformation.StableType);
            }
            wizard.SaveXml(fileName);
            
        }
    }
}