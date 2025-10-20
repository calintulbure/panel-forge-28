import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ProductAddFormProps {
  onSuccess: () => void;
}

export function ProductAddForm({ onSuccess }: ProductAddFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    erp_product_code: "",
    article_id: "",
    erp_product_description: "",
    categ1: "",
    categ2: "",
    categ3: "",
    stare_oferta: "",
    stare_stoc: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const productData: any = {
        erp_product_code: formData.erp_product_code,
        erp_product_description: formData.erp_product_description,
        categ1: formData.categ1 || null,
        categ2: formData.categ2 || null,
        categ3: formData.categ3 || null,
        stare_oferta: formData.stare_oferta || null,
        stare_stoc: formData.stare_stoc || null,
      };

      if (formData.article_id) {
        productData.article_id = parseInt(formData.article_id);
      }

      const { error } = await supabase.from("products").insert(productData);

      if (error) throw error;

      toast({
        title: "Product added",
        description: "Product has been successfully added",
      });

      onSuccess();
    } catch (error) {
      console.error("Add product error:", error);
      toast({
        title: "Error adding product",
        description: error instanceof Error ? error.message : "Failed to add product",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="erp_product_code">ERP Product Code *</Label>
          <Input
            id="erp_product_code"
            required
            value={formData.erp_product_code}
            onChange={(e) => setFormData({ ...formData, erp_product_code: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="article_id">Article ID</Label>
          <Input
            id="article_id"
            type="number"
            value={formData.article_id}
            onChange={(e) => setFormData({ ...formData, article_id: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="erp_product_description">Description</Label>
        <Textarea
          id="erp_product_description"
          value={formData.erp_product_description}
          onChange={(e) => setFormData({ ...formData, erp_product_description: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="categ1">Category 1</Label>
          <Input
            id="categ1"
            value={formData.categ1}
            onChange={(e) => setFormData({ ...formData, categ1: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="categ2">Category 2</Label>
          <Input
            id="categ2"
            value={formData.categ2}
            onChange={(e) => setFormData({ ...formData, categ2: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="categ3">Category 3</Label>
          <Input
            id="categ3"
            value={formData.categ3}
            onChange={(e) => setFormData({ ...formData, categ3: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="stare_oferta">Offer Status</Label>
          <Input
            id="stare_oferta"
            value={formData.stare_oferta}
            onChange={(e) => setFormData({ ...formData, stare_oferta: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="stare_stoc">Stock Status</Label>
          <Input
            id="stare_stoc"
            value={formData.stare_stoc}
            onChange={(e) => setFormData({ ...formData, stare_stoc: e.target.value })}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Adding..." : "Add Product"}
        </Button>
      </div>
    </form>
  );
}
