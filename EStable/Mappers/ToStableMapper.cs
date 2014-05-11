using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using EStable.Constants;
using EStable.Models;
using EStable.Models.Wizard;

namespace EStable.Mappers
{
    public interface IToStableTypeCodeMapper
    {
        int ToStableTypeCode(string type);
    }

    public interface IToStableMapper
    {
        Stable ToStable(SummaryWizard wizard);
    }

    public class ToStableTypeCodeMapper : IToStableTypeCodeMapper
    {
        public int ToStableTypeCode(string type)
        {
            switch (type)
            {
                case Codes.StableType.Pacer:
                case Codes.StableType.Trotter:
                    return Codes.StableTypeCode.Harness;
                case Codes.StableType.Greyhound:
                    return Codes.StableTypeCode.Greyhound;
                default:
                    return Codes.StableTypeCode.Thoroughbred;
            }
        }
    }

    public class ToStableMapper :IToStableMapper
    {
        private readonly IToStableTypeCodeMapper _stableTypeMapper = new ToStableTypeCodeMapper();

        public Stable ToStable(SummaryWizard wizard)
        {
            var stableInformation = wizard.ContactInformation;
            var stable = new Stable()
                {
                    Address = stableInformation.Address,
                    CountryCode = stableInformation.Jurisdiction,
                    Fax = stableInformation.Fax,
                    LegalName = stableInformation.LegalEntity,
                    Mobile = stableInformation.Mobile,
                    NextInvoice = 1,
                    Phone = stableInformation.Phone,
                    StableName = stableInformation.StableName,
                    StableTypeId = _stableTypeMapper.ToStableTypeCode(stableInformation.StableType),
                    Trainer = stableInformation.Trainer
                };
            if (wizard.FinancialInformation != null)
            {
                PopulateFinancialInformation(stable, wizard.FinancialInformation);
            }

            return stable;
        }

        private void PopulateFinancialInformation(Stable stable, FinancialInformationWizard financialInformation)
        {
            stable.GSTEffectiveDate = financialInformation.GSTEffectiveDate;
            stable.GSTRateCurrent = financialInformation.GSTRate;
            stable.GSTRatePrevious = financialInformation.PreviousGSTRate;
            stable.TaxNumber = financialInformation.GSTNumber;
        }
    }
}