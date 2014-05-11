using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace EStable.Validation
{
    public interface IStableChargeTypeValidator
    {
        IEnumerable<string> Validate(string unit, string instable, string description, string rate, string email);
    }

    public class StableChargeTypeValidator : IStableChargeTypeValidator
    {
        private IEnumerable<string> _errors;

        public IEnumerable<string> Errors
        {
            get { return _errors ?? (_errors = new List<string>()); }
        }

        public bool IsValid
        {
            get { return (null == Errors || false == Errors.Any()); }
        }

        public IEnumerable<string> Validate(string unit, string instable, string description, string rate, string email)
        {
            //TODO Validate the different properties.
            return Errors;
        }
    }
}